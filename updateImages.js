const fs = require('fs');

// 读取data.json文件
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// 提供的Shopify图片URL
const shopifyUrl = 'https://cdn.shopify.com/s/files/1/0522/3320/7988/files/04c1b54e734068ed38cbb1e9b5dc0310_1496e468-ee13-4afd-9d0a-421e486c898b.png?v=1768193797';

// 更新windowContents中的所有图片
for (const [key, content] of Object.entries(data.windowContents)) {
  // 更新主图片
  content.image = shopifyUrl;
  
  // 更新画廊图片数组
  if (content.galleryImages && Array.isArray(content.galleryImages)) {
    // 将所有画廊图片替换为Shopify URL
    content.galleryImages = content.galleryImages.map(() => shopifyUrl);
  }
}

// 将更新后的数据写回文件
fs.writeFileSync('data.json', JSON.stringify(data, null, 2), 'utf8');
