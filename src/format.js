const dayjs = require('dayjs');

function currency(value) {
  return Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  });
}

function date(value) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '';
}

function statusLabel(status) {
  return status === 'out_of_stock' ? 'Hết hàng' : 'Còn hàng';
}

module.exports = { currency, date, statusLabel };
