module.exports = function (BANK) {
  let failures = 0;
  try {
    // happy path
    const data = {
      typeCode: '11',
      requesterCode: '123',
      requesterName: 'テスト依頼人',
      tradeDate: '1108',
      toBankNo: '123',
      toBranchNo: '5',
      depositType: '普通',
      accountNumber: '12345'
    };
    const ok = (function(){
      try {
        let res = null;
        BANK.generateHeader(data, (r) => { res = r; });
        if (!res || res.error) return false;
        if (typeof res.header !== 'string') return false;
        // header should be 120 characters long per spec
        // header should be 120 bytes in SJIS-equivalent length
        const sjisByteLength = (str) => {
          if (!str) return 0;
          let len = 0;
          for (const ch of str) {
            const cp = ch.codePointAt(0);
            if (cp <= 0x7f) len += 1;
            else if (cp >= 0xff61 && cp <= 0xff9f) len += 1;
            else len += 2;
          }
          return len;
        };
        if (!(sjisByteLength(res.header) === 120)) return false;
  // check beginning: dataType(1) + typeCode(2) + codeClass(1) + requesterCode(10)
  if (res.header.charAt(0) !== '1') return false;
  if (res.header.slice(1,3) !== '11') return false; // typeCode
  if (res.header.charAt(3) !== '0') return false; // codeClass
        return true;
      } catch (e) { return false; }
    })();
    if (!ok) {
      console.error('FAIL: header happy path');
      // debug: print result
      try { console.error('header result:', JSON.stringify(res)); } catch (e) {}
      failures++;
    } else {
      console.log('PASS: header happy path');
    }
  } catch (e) {
    console.error('ERROR in header tests', e && e.message ? e.message : e);
    return 1;
  }

  try {
    // tradeDate invalid
  let errRes = null;
  BANK.generateHeader({ typeCode: '11', requesterCode: '1', requesterName: 'A', tradeDate: '11' }, (r) => { errRes = r; });
    if (!errRes || !errRes.error) {
      console.error('FAIL: header invalid tradeDate should error');
      failures++;
    } else {
      console.log('PASS: header invalid date');
    }
  } catch (e) {
    console.error('ERROR in header tests 2', e && e.message ? e.message : e);
    failures++;
  }

  return failures;
};
