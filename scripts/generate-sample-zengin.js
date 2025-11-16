// Quick script to call generateZenginData and print content length + first 3 lines
global.window = global;
require('../src/bank-transfer.js');

const headerData = {
  typeCode: '11',
  requesterCode: '12345',
  requesterName: 'テスト会社',
  tradeDate: '20251109',
  fromBankNo: '0001',
  fromBranchNo: '001',
  depositType: '普通',
  accountNumber: '1234567'
};

const records = [
  { toBankNo:'0005', toBranchNo:'123', toAccountType:'普通', toAccountNumber:'1234567', amount:1000, customerName:'ヤマダ タロウ' }
];

window.BANK.generateZenginData(headerData, records, (res) => {
  if (res && res.success) {
    console.log('SUCCESS');
    console.log('content length:', res.content.length);
    const lines = res.content.split(/\r?\n/);
    console.log('lines:', lines.length);
    for (let i=0;i<Math.min(4, lines.length);i++) {
      console.log(i+1+':', lines[i]);
    }
    // print hex-like or visible first 120 bytes of header
  } else {
    console.error('ERROR', res);
  }
});
