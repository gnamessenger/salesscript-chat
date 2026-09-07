var firebaseConfig = {
  apiKey: "AIzaSyBjL-AdZVHBZdsvzqniuPDynk7G3-kH6yU",
  authDomain: "salesscript-87136.firebaseapp.com",
  projectId: "salesscript-87136",
  storageBucket: "salesscript-87136.firebasestorage.app",
  messagingSenderId: "91082261854",
  appId: "1:91082261854:web:73018d6b146d69db6b3bcf"
};
firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();
var db = firebase.firestore();

var PRODUCT_LABEL = {
  'sales-script': '[대본집] 고가상품 세일즈 화법 완전정복',
  'insurance-personal': '보험 판매 화법 (개인)',
  'insurance-corporate': '보험 판매 화법 (법인)'
};
var STANDALONE_PRICE = {
  'sales-script': 79000,
  'insurance-personal': 59000,
  'insurance-corporate': 59000
};
// 조합별 확정 판매가 (정가 합계와 다름 = 묶음 할인 적용)
var BUNDLE_PRICE = {
  'sales-script': 79000,
  'insurance-personal': 59000,
  'insurance-corporate': 59000,
  'insurance-corporate,insurance-personal': 99000,
  'insurance-personal,sales-script': 119000,
  'insurance-corporate,sales-script': 119000,
  'insurance-corporate,insurance-personal,sales-script': 149000
};

function getBundlePrice(itemIds){
  return BUNDLE_PRICE[itemIds.slice().sort().join(',')];
}

// 하위호환용 (예전 코드가 참조할 수 있어 남겨둠)
var PRODUCT_NAME = PRODUCT_LABEL['sales-script'];
var PRODUCT_AMOUNT = STANDALONE_PRICE['sales-script'];

// 첫 구매 완료 시 발급되는 쿠폰 (8만원 이상 구매 시 사용 가능, 유효기간 없음)
var FIRST_PURCHASE_COUPON = { amount: 20000, minAmount: 80000 };

function issueFirstPurchaseCoupon(uid){
  var couponsRef = db.collection('coupons');
  return couponsRef.where('uid', '==', uid).limit(1).get().then(function(snap){
    if(!snap.empty){ return; } // 이미 쿠폰을 받은 적 있으면 중복 발급하지 않음
    return couponsRef.add({
      uid: uid,
      amount: FIRST_PURCHASE_COUPON.amount,
      minAmount: FIRST_PURCHASE_COUPON.minAmount,
      used: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  });
}

// 사용 가능한(미사용) 쿠폰 1개 조회
function getAvailableCoupon(uid){
  return db.collection('coupons').where('uid', '==', uid).where('used', '==', false).limit(1).get()
    .then(function(snap){
      if(snap.empty) return null;
      var doc = snap.docs[0];
      var d = doc.data();
      d.id = doc.id;
      return d;
    });
}

function useCoupon(couponId){
  return db.collection('coupons').doc(couponId).update({
    used: true,
    usedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function ensureOrder(user, itemIds, couponId){
  var sortedItems = (itemIds && itemIds.length) ? itemIds.slice().sort() : ['sales-script'];
  var amount = getBundlePrice(sortedItems);
  var productName = sortedItems.map(function(id){ return PRODUCT_LABEL[id]; }).join(' + ');
  var ordersRef = db.collection('orders');
  return ordersRef.where('uid', '==', user.uid).limit(1).get().then(function(existingSnap){
    var isFirstPurchase = existingSnap.empty;
    var couponDiscount = 0;
    var couponPromise = couponId ? useCoupon(couponId).then(function(){ couponDiscount = FIRST_PURCHASE_COUPON.amount; }) : Promise.resolve();
    return couponPromise.then(function(){
      return ordersRef.add({
        uid: user.uid,
        email: user.email,
        items: sortedItems,
        productName: productName,
        amount: Math.max(0, amount - couponDiscount),
        couponDiscount: couponDiscount,
        status: 'completed',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }).then(function(ref){
      if(isFirstPurchase){
        issueFirstPurchaseCoupon(user.uid);
      }
      return ref.get();
    });
  });
}

function hasPurchased(uid){
  return db.collection('orders').where('uid', '==', uid).where('status', '==', 'completed').limit(1).get()
    .then(function(snap){ return !snap.empty; });
}

// 유저가 실제로 보유한 상품 id 배열 (여러 건의 주문을 합산)
function getPurchasedItems(uid){
  return db.collection('orders').where('uid', '==', uid).where('status', '==', 'completed').get()
    .then(function(snap){
      var owned = {};
      snap.docs.forEach(function(doc){
        var items = doc.data().items;
        if(!items || !items.length){ items = ['sales-script']; } // 이전 방식으로 저장된 구주문 호환
        items.forEach(function(id){ owned[id] = true; });
      });
      return Object.keys(owned);
    });
}
// 하위호환용 별칭
var getOwnedProducts = getPurchasedItems;

function saveLead(data){
  return db.collection('leads').add({
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}
