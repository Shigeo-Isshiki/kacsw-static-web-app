module.exports = function (BANK) {
  let failures = 0;
  try {
    // happy path
    const meta = {
      senderBankCode: '123',
      senderBranchCode: '45',
      fileDate: '20251108',
      fileSeq: '1',
      senderName: 'テスト送信者'
    };
    const ok = (function(){
      try {
        let res = null;
        BANK.generateHeader(meta, (r) => { res = r; });
        if (!res || res.error) return false;
        if (typeof res.header !== 'string') return false;
        // header should start with H + 4-digit bank + 3-digit branch + 8-digit date + 4-digit seq
        if (!/^H[0-9]{4}[0-9]{3}20251108[0-9]{4}/.test(res.header)) return false;
        return true;
      } catch (e) { return false; }
    })();
    if (!ok) {
      console.error('FAIL: header happy path');
      failures++;
    } else {
      console.log('PASS: header happy path');
    }
  } catch (e) {
    console.error('ERROR in header tests', e && e.message ? e.message : e);
    return 1;
  }

  try {
    // fileDate invalid
    let errRes = null;
    BANK.generateHeader({ senderBankCode: '1', senderBranchCode: '2', fileDate: '202511', fileSeq: '1', senderName: 'A' }, (r) => { errRes = r; });
    if (!errRes || !errRes.error) {
      console.error('FAIL: header invalid date should error');
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
