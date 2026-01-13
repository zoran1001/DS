// 存储所有网页数据
let websiteData = {};
let windowContents = {};

// 颜色分析相关变量
let colorAnalysisCanvas;
let colorAnalysisCtx;
let isColorAnalysisActive = false;
let colorAnalysisInterval;

// 从JSON文件加载数据
async function loadData() {
    try {
        const response = await fetch('data.json');
        websiteData = await response.json();
        windowContents = websiteData.windowContents;
        
        return true;
    } catch (error) {
        // 移除日志输出，减少控制台信息
        return false;
    }
}

// 生成作品详情的HTML内容
function generateWorkHtml(content) {
    return `
        <div class="work-info">
            <div class="work-name">${content.name}</div>
            <div class="work-date">Created on: ${content.date}</div>
        </div>
        
        <div class="work-description">
            <h3>Project Introduction</h3>
            <p>${content.description}</p>
            <p>This artwork explores the depths of color and emotion through various techniques and materials.</p>
        </div>
        
        <div class="work-gallery">
            <h3>Gallery</h3>
            <div class="gallery-container">
                <div class="gallery-scroll">
                    <div class="gallery-wrapper">
                        ${content.galleryImages.map((img, index) => {
                            return `<img class="gallery-image" src="${img}" alt="Gallery Image ${index + 1}">`;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 初始化颜色分析画布
function initColorAnalysisCanvas() {
    colorAnalysisCanvas = document.getElementById('colorAnalysisCanvas');
    colorAnalysisCtx = colorAnalysisCanvas.getContext('2d');
}

// 计算颜色亮度 (0-255)
function calculateBrightness(r, g, b) {
    return (r * 299 + g * 587 + b * 114) / 1000;
}

// 获取媒体元素指定区域的平均颜色
function getMediaAverageColor(mediaElement, area = null) {
    // 检查mediaElement是否存在
    if (!mediaElement) {
        // 移除日志输出，减少控制台信息
        return { r: 255, g: 255, b: 255 }; // 默认返回白色背景
    }
    
    if (!colorAnalysisCanvas || !colorAnalysisCtx) {
        initColorAnalysisCanvas();
    }
    
    try {
        // 获取媒体元素的实际尺寸，添加安全检查
        const mediaWidth = mediaElement.videoWidth || mediaElement.naturalWidth || mediaElement.offsetWidth || 100;
        const mediaHeight = mediaElement.videoHeight || mediaElement.naturalHeight || mediaElement.offsetHeight || 100;
        
        // 避免除以零错误
        const safeMediaWidth = mediaWidth || 100;
        const safeMediaHeight = mediaHeight || 100;
        
        // 设置画布大小，保持媒体的宽高比
        const canvasWidth = 100;
        const canvasHeight = Math.round(canvasWidth * (safeMediaHeight / safeMediaWidth));
        colorAnalysisCanvas.width = canvasWidth;
        colorAnalysisCanvas.height = canvasHeight;
        
        // 绘制整个媒体到画布
        colorAnalysisCtx.drawImage(mediaElement, 0, 0, canvasWidth, canvasHeight);
        
        let imageData;
        let data;
        
        try {
            if (area) {
                // 如果指定了区域，只获取该区域的图像数据
                // 确保区域参数有效
                const safeArea = {
                    x: Math.max(0, Math.min(area.x || 0, canvasWidth - 1)),
                    y: Math.max(0, Math.min(area.y || 0, canvasHeight - 1)),
                    width: Math.max(1, Math.min(area.width || canvasWidth, canvasWidth)),
                    height: Math.max(1, Math.min(area.height || canvasHeight, canvasHeight))
                };
                imageData = colorAnalysisCtx.getImageData(safeArea.x, safeArea.y, safeArea.width, safeArea.height);
            } else {
                // 否则获取整个画布的图像数据
                imageData = colorAnalysisCtx.getImageData(0, 0, canvasWidth, canvasHeight);
            }
            
            data = imageData.data;
            
            let r = 0, g = 0, b = 0;
            let pixelCount = 0;
            
            // 计算平均颜色（每隔4个像素采样一次，提高性能）
            for (let i = 0; i < data.length; i += 16) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                pixelCount++;
            }
            
            if (pixelCount === 0) return { r: 255, g: 255, b: 255 }; // 默认返回白色背景
            
            r = Math.floor(r / pixelCount);
            g = Math.floor(g / pixelCount);
            b = Math.floor(b / pixelCount);
            
            return { r, g, b };
        } catch (error) {
            // 处理跨域资源污染画布的情况
            if (error.name === 'SecurityError') {
                // 移除日志输出，减少控制台信息
                // 返回一个默认颜色（灰色），可以根据需要调整
                return { r: 128, g: 128, b: 128 };
            } else {
                // 其他错误，重新抛出
                throw error;
            }
        }
    } catch (error) {
        // 移除日志输出，减少控制台信息
        return { r: 255, g: 255, b: 255 }; // 出错时返回默认值
    }
}

// 分析单个元素下方的媒体颜色并调整文字颜色
function analyzeElementColor(element, mediaElement) {
    // 安全检查
    if (!element || !mediaElement) {
        return;
    }
    
    try {
        const heroBanner = document.querySelector('.hero-banner');
        const mediaContainer = document.querySelector('.hero-media');
        
        if (!heroBanner || !mediaContainer) {
            return;
        }
        
        // 获取元素在视口中的位置和尺寸
        const elementRect = element.getBoundingClientRect();
        const bannerRect = heroBanner.getBoundingClientRect();
        const mediaRect = mediaContainer.getBoundingClientRect();
        
        // 安全检查
        if (!elementRect || !bannerRect || !mediaRect) {
            return;
        }
        
        // 计算元素在hero-banner内的相对位置
        const relativeX = elementRect.left - bannerRect.left;
        const relativeY = elementRect.top - bannerRect.top;
        const elementWidth = elementRect.width;
        const elementHeight = elementRect.height;
        
        // 计算媒体元素的缩放比例（媒体实际尺寸 vs 显示尺寸）
        const mediaNaturalWidth = mediaElement.videoWidth || mediaElement.naturalWidth || mediaElement.offsetWidth || 100;
        const mediaNaturalHeight = mediaElement.videoHeight || mediaElement.naturalHeight || mediaElement.offsetHeight || 100;
        const mediaDisplayWidth = mediaRect.width || 100;
        const mediaDisplayHeight = mediaRect.height || 100;
        
        // 避免除以零
        const safeMediaDisplayWidth = mediaDisplayWidth || 1;
        const safeMediaDisplayHeight = mediaDisplayHeight || 1;
        
        const scaleX = mediaNaturalWidth / safeMediaDisplayWidth;
        const scaleY = mediaNaturalHeight / safeMediaDisplayHeight;
        
        // 计算元素在媒体容器内的相对位置（考虑媒体容器可能有padding等）
        const mediaContainerPaddingLeft = parseFloat(getComputedStyle(mediaContainer).paddingLeft) || 0;
        const mediaContainerPaddingTop = parseFloat(getComputedStyle(mediaContainer).paddingTop) || 0;
        
        const xInMedia = relativeX - mediaContainerPaddingLeft;
        const yInMedia = relativeY - mediaContainerPaddingTop;
        
        // 获取画布尺寸
        const canvasWidth = colorAnalysisCanvas ? colorAnalysisCanvas.width : 100;
        const canvasHeight = colorAnalysisCanvas ? colorAnalysisCanvas.height : 100;
        
        // 避免除以零
        const safeMediaNaturalWidth = mediaNaturalWidth || 1;
        const safeMediaNaturalHeight = mediaNaturalHeight || 1;
        
        // 计算画布与媒体实际尺寸的比例
        const canvasToMediaRatioX = canvasWidth / safeMediaNaturalWidth;
        const canvasToMediaRatioY = canvasHeight / safeMediaNaturalHeight;
        
        // 计算在画布上的区域坐标和尺寸
        const area = {
            x: Math.round(xInMedia * scaleX * canvasToMediaRatioX),
            y: Math.round(yInMedia * scaleY * canvasToMediaRatioY),
            width: Math.max(1, Math.round(elementWidth * scaleX * canvasToMediaRatioX)),
            height: Math.max(1, Math.round(elementHeight * scaleY * canvasToMediaRatioY))
        };
        
        // 确保区域在画布范围内
        area.x = Math.max(0, Math.min(area.x || 0, canvasWidth - 1));
        area.y = Math.max(0, Math.min(area.y || 0, canvasHeight - 1));
        area.width = Math.max(1, Math.min(area.width || canvasWidth, canvasWidth));
        area.height = Math.max(1, Math.min(area.height || canvasHeight, canvasHeight));
        
        // 获取该区域的平均颜色
        const avgColor = getMediaAverageColor(mediaElement, area);
        
        // 安全检查
        if (!avgColor) {
            return;
        }
        
        const brightness = calculateBrightness(avgColor.r, avgColor.g, avgColor.b);
        
        // 根据亮度确定文字颜色
        // 亮度 > 128 表示背景较亮，使用深色文字
        // 亮度 <= 128 表示背景较暗，使用浅色文字
        const textColor = brightness > 128 ? '#333333' : '#ffffff';
        const textShadow = brightness > 128 ? '2px 2px 4px rgba(0, 0, 0, 0.1)' : '2px 2px 4px rgba(0, 0, 0, 0.3)';
        
        // 应用颜色到元素
        element.style.color = textColor;
        element.style.textShadow = textShadow;
        
        // 如果是按钮，还需要设置边框颜色
        if (element.classList && element.classList.contains('scroll-btn')) {
            element.style.borderColor = textColor;
        }
    } catch (error) {
        // 移除日志输出，减少控制台信息
    }
}

// 将文本按单词拆分为元素
function splitTextIntoElements(element) {
    if (!element) return;
    
    const text = element.textContent;
    
    // 按单词拆分
    const words = text.split(/\s+/);
    
    // 清空原元素内容
    element.innerHTML = '';
    
    // 添加每个单词作为独立元素
    words.forEach((word, index) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'text-segment';
        wordSpan.textContent = word;
        element.appendChild(wordSpan);
        
        // 添加单词间的空格，使用margin-right实现
        if (index < words.length - 1) {
            const spaceSpan = document.createElement('span');
            spaceSpan.className = 'text-segment space-segment';
            spaceSpan.textContent = ' ';
            // 设置空格宽度为一个字母的宽度
            spaceSpan.style.marginRight = '0.5em';
            element.appendChild(spaceSpan);
        }
    });
}

// 初始化标题文本，按单词拆分并设置默认颜色
function initTitleText() {
    try {
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            // 为h1标题按单词拆分
            const h1 = heroContent.querySelector('h1');
            if (h1) {
                splitTextIntoElements(h1);
                
                // 为每个文本片段设置默认颜色
                const textSegments = h1.querySelectorAll('.text-segment');
                textSegments.forEach(segment => {
                    // 设置默认黑色，不考虑背景颜色
                    segment.style.color = '#333333';
                    segment.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.1)';
                });
            }
            
            // 为副标题设置默认颜色
            const p = heroContent.querySelector('p');
            if (p) {
                p.style.color = '#333333';
                p.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.1)';
            }
        }
        
        // 为滚动按钮设置默认颜色
        const scrollBtn = document.querySelector('.scroll-btn');
        if (scrollBtn) {
            scrollBtn.style.color = '#333333';
            scrollBtn.style.borderColor = '#333333';
            scrollBtn.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.1)';
        }
    } catch (error) {
        // 移除日志输出，减少控制台信息
    }
}

// 启动颜色分析 - 已废弃，使用initTitleText替代
function startColorAnalysis() {
    // 直接调用初始化函数，不进行颜色分析
    initTitleText();
}

// 停止颜色分析 - 已废弃
function stopColorAnalysis() {
    // 空函数，保持兼容性
}

// 更新页面内容
function updatePageContent() {
    // 更新首页内容
    const heroTitle = document.querySelector('.hero-content h1');
    const heroSubtitle = document.querySelector('.hero-content p');
    const scrollBtn = document.querySelector('.scroll-btn');
    const heroMedia = document.querySelector('.hero-media');
    
    if (heroTitle && websiteData.home.hero) {
        // 设置原始文本内容
        heroTitle.innerHTML = '';
        heroTitle.textContent = websiteData.home.hero.title;
    }
    if (heroSubtitle && websiteData.home.hero) {
        heroSubtitle.textContent = websiteData.home.hero.subtitle;
    }
    if (scrollBtn && websiteData.home.hero) {
        scrollBtn.textContent = websiteData.home.hero.buttonText;
    }
    
    // 更新首页媒体
    if (heroMedia && websiteData.home.hero.media) {
        const media = websiteData.home.hero.media;
        
        // 清空现有媒体内容
        heroMedia.innerHTML = '';
        
        // 根据媒体类型创建不同的媒体元素
        if (media.url) {
            switch (media.type) {
                case 'image':
                case 'gif':
                    // 创建图片或动图
                    const img = document.createElement('img');
                    img.crossOrigin = 'anonymous'; // 添加跨域属性
                    img.src = media.url;
                    img.alt = media.alt || 'Hero Media';
                    img.onload = function() {
                        initTitleText();
                    };
                    // 添加错误处理
                    img.onerror = function() {
                        // 移除日志输出，减少控制台信息
                        // 使用默认背景色
                        const defaultBg = document.createElement('div');
                        defaultBg.style.width = '100%';
                        defaultBg.style.height = '100%';
                        defaultBg.style.backgroundColor = '#333333';
                        heroMedia.innerHTML = '';
                        heroMedia.appendChild(defaultBg);
                        setTimeout(initTitleText, 100);
                    };
                    heroMedia.appendChild(img);
                    break;
                    
                case 'video':
                    // 创建视频
                    const video = document.createElement('video');
                    video.crossOrigin = 'anonymous'; // 添加跨域属性
                    video.src = media.url;
                    video.autoplay = true;
                    video.loop = true;
                    video.muted = true;
                    video.playsinline = true;
                    video.alt = media.alt || 'Hero Video';
                    video.onloadeddata = function() {
                        initTitleText();
                    };
                    // 添加错误处理
                    video.onerror = function() {
                        // 移除日志输出，减少控制台信息
                        // 可以创建一个默认的背景元素
                        const defaultBg = document.createElement('div');
                        defaultBg.style.width = '100%';
                        defaultBg.style.height = '100%';
                        defaultBg.style.backgroundColor = '#333333';
                        heroMedia.innerHTML = '';
                        heroMedia.appendChild(defaultBg);
                        setTimeout(initTitleText, 100);
                    };
                    heroMedia.appendChild(video);
                    break;
            }
        }
    }
    
    // 更新滚动提示
    const scrollHint = document.querySelector('.scroll-hint span');
    if (scrollHint && websiteData.gallery) {
        scrollHint.textContent = websiteData.gallery.scrollHint;
    }
    
    // 更新gallery项标题
    if (websiteData.gallery && websiteData.gallery.items) {
        websiteData.gallery.items.forEach(item => {
            const galleryItem = document.querySelector(`.gallery-item.${item.id}`);
            if (galleryItem) {
                const caption = galleryItem.querySelector('.caption');
                if (caption) {
                    caption.textContent = item.caption;
                }
                const itemNumber = galleryItem.querySelector('.item-number');
                if (itemNumber) {
                    itemNumber.textContent = item.number;
                }
            }
        });
    }
    
    // 更新关于我内容
    const aboutName = document.querySelector('.personal-intro h3');
    const aboutJobTitle = document.querySelector('.personal-intro .job-title');
    const ageElement = document.getElementById('age');
    
    if (aboutName && websiteData.about.personal) {
        aboutName.textContent = websiteData.about.personal.name;
    }
    if (aboutJobTitle && websiteData.about.personal) {
        aboutJobTitle.textContent = websiteData.about.personal.jobTitle;
    }
    
    // 计算并显示年龄
    if (ageElement) {
        // 出生日期：1998年10月1日
        const birthDate = new Date(1998, 9, 1); // 月份从0开始，10月是9
        const currentDate = new Date();
        
        // 计算年龄
        let age = currentDate.getFullYear() - birthDate.getFullYear();
        const birthMonth = birthDate.getMonth();
        const birthDay = birthDate.getDate();
        const currentMonth = currentDate.getMonth();
        const currentDay = currentDate.getDate();
        
        // 如果当前月份小于出生月份，或者当前月份等于出生月份但当前日期小于出生日期，则年龄减1
        if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
            age--;
        }
        
        ageElement.textContent = age;
    }
    
    // 更新个人照片
    const photoPlaceholder = document.querySelector('.photo-placeholder');
    if (photoPlaceholder && websiteData.about.personal) {
        const photoUrl = websiteData.about.personal.photo || 'https://cdn.shopify.com/s/files/1/0522/3320/7988/files/04c1b54e734068ed38cbb1e9b5dc0310_1496e468-ee13-4afd-9d0a-421e486c898b.png?v=1768193797';
        
        // 替换占位符为实际图片
        photoPlaceholder.innerHTML = `<img src="${photoUrl}" alt="个人照片" style="width: 100%; height: 100%; object-fit: cover;">`;
    }
    
    // 更新所有作品分类项的背景图片
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    if (websiteData.gallery && websiteData.gallery.items) {
        galleryItems.forEach(item => {
            const itemId = item.className.split(' ').find(cls => cls.startsWith('window'));
            if (itemId) {
                const galleryItemData = websiteData.gallery.items.find(dataItem => dataItem.id === itemId);
                if (galleryItemData && galleryItemData.image) {
                    // 设置背景图片
                    item.style.backgroundImage = `url('${galleryItemData.image}')`;
                    // 去掉背景色，只显示图片
                    item.style.backgroundColor = 'transparent';
                    // 去掉叠加效果
                    item.style.backgroundBlendMode = 'normal';
                }
            }
        });
    }
    
    // 更新联系信息
    const contactItems = document.querySelectorAll('.contact-info-item');
    if (contactItems.length > 0 && websiteData.contact.info) {
        websiteData.contact.info.forEach((info, index) => {
            if (contactItems[index]) {
                const icon = contactItems[index].querySelector('.contact-info-icon i');
                const value = contactItems[index].querySelector('.contact-info-text p');
                const type = contactItems[index].querySelector('.contact-info-text h4');
                
                if (icon) {
                    icon.className = `fas ${info.icon}`;
                }
                if (value) {
                    value.textContent = info.value;
                }
                if (type) {
                    type.textContent = info.type;
                }
            }
        });
    }
}

// 检查数据是否有更新
let lastDataHash = '';

async function checkForUpdates() {
    try {
        const response = await fetch('data.json');
        const newData = await response.json();
        const newDataHash = JSON.stringify(newData);
        
        if (newDataHash !== lastDataHash) {
            // 数据有更新，重新加载并更新页面
            websiteData = newData;
            windowContents = newData.windowContents;
            lastDataHash = newDataHash;
            updatePageContent();
            // 数据更新后重新初始化标题文本
            setTimeout(initTitleText, 100);
            // 移除日志输出，减少控制台信息
        }
    } catch (error) {
        // 移除日志输出，减少控制台信息
    }
}

// DOM加载完成后执行
document.addEventListener('DOMContentLoaded', async function() {
    // 加载数据
    const dataLoaded = await loadData();
    if (!dataLoaded) {
        // 移除日志输出，减少控制台信息
        return;
    }
    
    // 初始化数据哈希
    lastDataHash = JSON.stringify(websiteData);
    
    // 更新页面内容
    updatePageContent();
    
    // 初始化标题文本和默认颜色
    initTitleText();
    
    // 设置轮询，每5秒检查一次更新
    setInterval(checkForUpdates, 5000);
    
    // 获取模态框元素
    const modal = document.getElementById('myModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalImage = document.getElementById('modalImage');
    const modalColorBackground = document.getElementById('modalColorBackground');
    const modalText = document.getElementById('modalText');
    const closeModal = document.getElementById('closeModal');
    const modalPrevBtn = document.getElementById('modalPrevBtn');
    const modalNextBtn = document.getElementById('modalNextBtn');
    
    // 当前显示的作品索引
    let currentWindowIndex = 0;
    // 当前作品分类
    let currentCategory = 'window1';
    
    // 获取当前分类的所有作品URL
    function getCurrentCategoryUrls() {
        return Object.keys(windowContents).filter(url => 
            windowContents[url].category === currentCategory
        );
    }
    
    // 获取作品分类模块元素
    const gallery = document.getElementById('gallery');
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    // 初始化：设置第一个作品为高亮状态
    if (galleryItems.length > 0) {
        galleryItems[0].classList.add('active');
    }
    
    // 滚动监听函数：判断哪个作品在视口中并高亮
    function updateActiveItem() {
        const galleryRect = gallery.getBoundingClientRect();
        const galleryCenter = galleryRect.left + galleryRect.width / 2;
        
        let closestItem = null;
        let minDistance = Infinity;
        
        galleryItems.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.left + itemRect.width / 2;
            const distance = Math.abs(itemCenter - galleryCenter);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestItem = item;
            }
        });
        
        // 更新高亮状态
        galleryItems.forEach(item => item.classList.remove('active'));
        if (closestItem) {
            closestItem.classList.add('active');
        }
    }
    
    // 添加滚动延迟标志，避免点击时误触滚动监听
    let scrollTimeout = null;
    let isButtonClick = false; // 标志是否正在执行按钮点击操作
    
    // 为作品分类模块添加滚动监听
    gallery.addEventListener('scroll', () => {
        // 如果是按钮点击操作导致的滚动，则不执行updateActiveItem
        if (isButtonClick) return;
        
        // 清除之前的定时器
        clearTimeout(scrollTimeout);
        // 设置新的定时器，延迟更新高亮状态
        scrollTimeout = setTimeout(() => {
            updateActiveItem();
        }, 100);
    });
    
    // 窗口大小变化时重新计算高亮项
    window.addEventListener('resize', () => {
        updateActiveItem();
    });
    
    // 设置作品为高亮并滚动到居中
    function setActiveItem(item) {
        // 更新高亮状态（立即设置，不等待滚动完成）
        galleryItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // 计算滚动位置 - 让当前项居中显示
        const itemRect = item.getBoundingClientRect();
        const galleryRect = gallery.getBoundingClientRect();
        
        // 使用offsetLeft计算元素相对于父容器的位置，确保滚动到非可视区域时也能正确计算
        const scrollLeft = item.offsetLeft - (galleryRect.width - itemRect.width) / 2;
        
        // 计算最大滚动位置（避免滚动过度）
        const maxScrollLeft = gallery.scrollWidth - galleryRect.width;
        
        // 确保滚动位置在有效范围内
        const finalScrollLeft = Math.max(0, Math.min(scrollLeft, maxScrollLeft));
        
        // 设置标志，禁用滚动监听
        isButtonClick = true;
        
        // 使用滚动捕捉实现平滑居中对齐
        gallery.scrollTo({
            left: finalScrollLeft,
            behavior: 'smooth'
        });
        
        // 滚动完成后重新启用滚动监听
        setTimeout(() => {
            isButtonClick = false;
            // 再次确认高亮状态
            galleryItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        }, 500);
    }
    
    // 为每个作品项添加点击事件
    galleryItems.forEach(item => {
        // 移除原始的onclick属性，使用JavaScript事件监听器
        const originalOnclick = item.getAttribute('onclick');
        item.removeAttribute('onclick');
        
        // 添加新的点击事件处理
        item.addEventListener('click', () => {
            // 清除滚动定时器，避免点击时触发滚动监听
            clearTimeout(scrollTimeout);
            
            // 如果不是高亮作品
            if (!item.classList.contains('active')) {
                // 设置为高亮并滚动到居中
                setActiveItem(item);
            } else {
                // 如果是高亮作品，执行原始的onclick函数
                if (originalOnclick) {
                    // 解析原始onclick中的URL
                    const url = originalOnclick.match(/'([^']+)'/)[1];
                    openWindow(url);
                }
            }
        });
    });
    
    // 修改openWindow函数，显示模态框（开窗户效果）
    window.openWindow = function(url) {
        const content = windowContents[url];
        if (content) {
            // 更新当前作品分类和索引
            currentCategory = content.category;
            const currentUrls = getCurrentCategoryUrls();
            currentWindowIndex = currentUrls.indexOf(url);
            
            modalTitle.textContent = content.title;
            // 设置模态框背景色和渐变效果
            modalColorBackground.style.background = `linear-gradient(135deg, ${content.backgroundColor} 0%, ${lightenColor(content.backgroundColor, 20)} 100%)`;
            modalImage.src = content.image;
            modalImage.alt = content.title;
            modalText.innerHTML = generateWorkHtml(content);
            modal.style.display = 'block';
            // 添加延迟确保动画效果能正确触发
            setTimeout(() => {
                modal.classList.add('show');
                // 初始化画廊滚动效果
                initGalleryScroll();
            }, 10);
        }
    };
    
    // 初始化画廊滚动效果
    function initGalleryScroll() {
        const galleryWrappers = document.querySelectorAll('.gallery-wrapper');
        
        galleryWrappers.forEach(wrapper => {
            // 克隆所有图片和div元素以创建无缝滚动效果
            const items = wrapper.querySelectorAll('img, .gallery-image');
            items.forEach(item => {
                const clone = item.cloneNode(true);
                wrapper.appendChild(clone);
            });
            
            // 计算总宽度并设置给wrapper
            const totalWidth = Array.from(items).reduce((total, item) => {
                // 对于正方形元素，宽度等于高度
                const width = item.offsetHeight; // 使用offsetHeight作为宽度（正方形）
                return total + width + 20; // 20px margin-right
            }, 0);
            
            wrapper.style.width = `${totalWidth}px`;
            // 重新开始动画
            wrapper.style.animation = 'none';
            wrapper.offsetHeight; // 触发重排
            wrapper.style.animation = 'scrollGallery 30s linear infinite';
        });
    };
    
    // 根据索引显示作品（仅在当前分类内切换）
    function showWindowByIndex(index) {
        const currentUrls = getCurrentCategoryUrls();
        // 确保索引在当前分类的有效范围内
        const validIndex = (index + currentUrls.length) % currentUrls.length;
        const url = currentUrls[validIndex];
        window.openWindow(url);
    };
    
    // 上一个作品按钮点击事件
    modalPrevBtn.addEventListener('click', () => {
        showWindowByIndex(currentWindowIndex - 1);
    });
    
    // 下一个作品按钮点击事件
    modalNextBtn.addEventListener('click', () => {
        showWindowByIndex(currentWindowIndex + 1);
    });
    
    // 辅助函数：将颜色变亮
    function lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    };

    // 关闭模态框
    closeModal.addEventListener('click', () => {
        modal.classList.remove('show');
        // 等待动画完成后隐藏模态框
        setTimeout(() => {
            modal.style.display = 'none';
        }, 500);
    });

    // 点击模态框外部关闭模态框
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.classList.remove('show');
            // 等待动画完成后隐藏模态框
            setTimeout(() => {
                modal.style.display = 'none';
            }, 500);
        }
    });

    // 平滑滚动功能 - 点击View Works按钮滚动到作品分类模块，使其位于视口最顶端
    const scrollBtn = document.querySelector('.scroll-btn');
    if (scrollBtn) {
        scrollBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                // 获取外部容器元素，而不是内部gallery元素
                const targetContainer = targetElement.closest('.gallery-container');
                if (targetContainer) {
                    window.scrollTo({
                        top: targetContainer.offsetTop,
                        behavior: 'smooth'
                    });
                } else {
                    // 如果找不到容器，回退到原始目标
                    window.scrollTo({
                        top: targetElement.offsetTop,
                        behavior: 'smooth'
                    });
                }
            }
        });
    }

    // Particle Effect Implementation with 3D and Depth
    const canvas = document.getElementById('particlesCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match hero-banner
    function resizeCanvas() {
        const heroBanner = document.querySelector('.hero-banner');
        canvas.width = heroBanner.offsetWidth;
        canvas.height = heroBanner.offsetHeight;
    }
    
    // Debounce function to limit resize calls
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    const debouncedResizeCanvas = debounce(resizeCanvas, 250);
    
    resizeCanvas();
    window.addEventListener('resize', debouncedResizeCanvas);
    
    // Mouse move event listener
    document.addEventListener('mousemove', (e) => {
        const heroBanner = document.querySelector('.hero-banner');
        const rect = heroBanner.getBoundingClientRect();
        mouse.targetX = e.clientX - rect.left;
        mouse.targetY = e.clientY - rect.top;
    });
    
    // Create particles - reduced count for better performance
    const particles = [];
    const particleCount = 30;
    
    // Perspective parameters for 3D effect
    const perspective = {
        fov: 500,  // Field of view
        vanishingPointX: canvas.width / 2,
        vanishingPointY: canvas.height / 2
    };
    
    // Mouse tracking for camera follow effect
    const mouse = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        targetX: canvas.width / 2,
        targetY: canvas.height / 2
    };
    
    // Smooth camera follow speed
    const cameraFollowSpeed = 0.02;
    

    
    class Particle {
        constructor() {
            this.reset();
        }
        
        reset() {
            // 3D coordinates
            this.x = Math.random() * canvas.width - canvas.width / 2;
            this.y = Math.random() * canvas.height - canvas.height / 2;
            this.z = Math.random() * 500;
            this.size = Math.random() * 4 + 1;
            
            // Speed in 3D space
            this.speedX = Math.random() * 2 - 1;
            this.speedY = Math.random() * 2 - 1;
            this.speedZ = Math.random() * 3 - 1.5;
            
            // Random color from gray theme
            const colors = [
                'rgba(51, 51, 51, 0.9)',    // Primary gray
                'rgba(136, 136, 136, 0.8)',  // Accent gray
                'rgba(204, 204, 204, 0.7)',  // Light gray
                'rgba(255, 255, 255, 0.5)'   // White
            ];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }
        
        update() {
            // Update 3D position
            this.x += this.speedX;
            this.y += this.speedY;
            this.z += this.speedZ;
            
            // Reset particle if it goes too far or out of bounds
            if (this.z > 1000 || this.z < -100 || 
                this.x > canvas.width || this.x < -canvas.width || 
                this.y > canvas.height || this.y < -canvas.height) {
                this.reset();
            }
        }
        
        draw() {
            // Apply perspective projection
            const scale = perspective.fov / (perspective.fov + this.z);
            
            // Calculate mouse offset based on particle depth
            // Closer particles have more offset, creating parallax effect
            const mouseOffsetX = (mouse.x - canvas.width / 2) * (this.z / 300);
            const mouseOffsetY = (mouse.y - canvas.height / 2) * (this.z / 300);
            
            // Project 3D coordinates to 2D with mouse offset
            const projectedX = perspective.vanishingPointX + this.x * scale + mouseOffsetX;
            const projectedY = perspective.vanishingPointY + this.y * scale + mouseOffsetY;
            const projectedSize = this.size * scale;
            
            // Calculate opacity based on distance (z-axis)
            const opacity = Math.max(0, Math.min(1, 1 - (this.z / 600)));
            
            // Draw particle with perspective and camera follow applied
            ctx.fillStyle = this.color.replace('0.9', opacity).replace('0.8', opacity).replace('0.7', opacity).replace('0.5', opacity);
            ctx.beginPath();
            ctx.arc(projectedX, projectedY, projectedSize, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
        }
        
        // Get depth for sorting
        getDepth() {
            return this.z;
        }
    }
    
    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    
    // Animation loop - optimized by removing expensive sort
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Smoothly update mouse position for camera follow
        mouse.x += (mouse.targetX - mouse.x) * cameraFollowSpeed;
        mouse.y += (mouse.targetY - mouse.y) * cameraFollowSpeed;
        
        // Update and draw particles without sorting
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();

    // 实现懒加载动画 - IntersectionObserver
    const observerOptions = {
        threshold: 0.05, // 当元素可见度达到5%时就触发，更早开始动画
        rootMargin: '-50px 0px -50px 0px' // 添加上下负边距，元素刚进入视口就触发动画
    };

    // 创建统一的IntersectionObserver实例
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 元素进入视口，添加active类触发动画
                entry.target.classList.add('active');
                // 停止观察已触发动画的元素
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // 观察所有带有fade-in类的元素
    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(element => {
        observer.observe(element);
        
        // 立即检查元素是否已经在视口中，如果是则手动添加active类
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom >= 0;
        if (isVisible) {
            element.classList.add('active');
        }
    });

    // 为所有需要动画的元素添加animate-on-scroll类并观察
    const elementsToAnimate = document.querySelectorAll('.about-me, .contact-me, .learning-path, .work-anchor, .skill-curve, .work-item, .path-item, .skill-item');
    elementsToAnimate.forEach(element => {
        if (!element.classList.contains('animate-on-scroll')) {
            element.classList.add('animate-on-scroll');
        }
        // 确保所有元素都被观察
        observer.observe(element);
    });

    // 观察所有带有animate-on-scroll类的元素
    const animateOnScrollElements = document.querySelectorAll('.animate-on-scroll');
    animateOnScrollElements.forEach(element => {
        observer.observe(element);
    });

    // 动画结束后移除will-change属性，避免占用过多显存
    const animatedElements = document.querySelectorAll('.hero-content h1, .hero-content p, .scroll-btn, .fade-in, .animate-on-scroll');
    animatedElements.forEach(element => {
        element.addEventListener('animationend', () => {
            element.style.willChange = 'auto';
        });
    });
});
