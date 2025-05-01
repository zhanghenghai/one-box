let longPressActivated = false;

// 添加编辑模式背景
const editModeBg = document.createElement('div');
editModeBg.className = 'edit-mode-bg';
document.body.appendChild(editModeBg);

// 全局文件夹处理函数
function openFolder(folder) {
    const folderPopup = folder.querySelector(".folder-popup");
    folderPopup.classList.toggle("open");
    if (folderPopup.classList.contains("open")) {
        const popupRect = folderPopup.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        folderPopup.style.left = `${(screenWidth - popupRect.width) / 2}px`;
        folderPopup.style.top = `${(screenHeight - popupRect.height) / 2}px`;
        folderPopup.innerHTML = "";
        const folderContent = folder.querySelector(".folder-content");
        Array.from(folderContent.children).forEach((app, index) => {
            const appClone = app.cloneNode(true);
            appClone.style.cssText = "";
            appClone.style.position = "absolute";
            appClone.style.left = `${(index % 3) * 60}px`;
            appClone.style.top = `${Math.floor(index / 3) * 60}px`;
            folderPopup.appendChild(appClone);
            
            // 为弹出窗口中的应用添加点击事件
            appClone.addEventListener("click", function(e) {
                e.stopPropagation();
                if (!longPressActivated) {
                    // 尝试多种方式获取URL
                    const url = this.dataset.url || this.getAttribute('data-url');
                    console.log("点击弹窗内APP, URL:", url);
                    if (url) {
                        window.location.href = url;
                    }
                }
            });
        });
    }
}

// 全局关闭文件夹函数
function closeAllFolders() {
    document.querySelectorAll(".folder-popup.open").forEach(popup => {
        popup.classList.remove("open");
    });
}

// 添加全局点击事件监听，关闭文件夹
document.addEventListener("click", function(e) {
    if (!e.target.closest(".folder")) {
        closeAllFolders();
    }
});

$(function () {
    const store = {
        set: function (key, val) {
            if (!val) return;
            try {
                const json = JSON.stringify(val);
                if (typeof JSON.parse(json) === "object") {
                    localStorage.setItem(key, json);
                }
            } catch (e) {
                return false;
            }
        },
        get: function (key) {
            if (this.has(key)) return JSON.parse(localStorage.getItem(key));
        },
        has: function (key) {
            return localStorage.getItem(key) !== null;
        },
        del: function (key) {
            localStorage.removeItem(key);
        }
    };
    const bookMarkFn = function (options) {
        $.ajax({
            url: "http://127.0.0.1:8089/api/getBookmarkParent",
            type: "get",
            dataType: "json",
            success: function (res) {
                this.options = $.extend({}, res, options);
                this.init();
            }.bind(this)
        });
    };
    bookMarkFn.prototype = {
        init: function () {
            const data = this.options.data;
            const totalCount = data.length;
            const firstPageDivCount = 8;
            const otherPageDivCount = 20;
            const pageDivCount = totalCount - 8;
            const numGroups = Math.ceil(pageDivCount / otherPageDivCount);

            // 检查是否有保存的布局
            const savedLayouts = {};
            for (let i = 1; i <= numGroups; i++) {
                const savedLayout = store.get(`desktopLayout_one${i}`);
                if (savedLayout) {
                    savedLayouts[i] = savedLayout;
                }
            }

            // 创建第一页布局
            let oneHtml = '<div style="min-height: 70px;flex: 1;display: flex;flex-wrap:wrap;">';
            for (let i = 0; i < firstPageDivCount && i < totalCount; i++) {
                oneHtml += `<div style="height:100%;flex: 0 0 25%;margin-bottom:5%" data-url="${data[i].url}" onclick="window.location.href='${data[i].url}'">
                              <div class="img" style="background-image: url(${data[i].img})"></div>
                              <div class="text">${data[i].hl}</div>
                            </div>`;
            }
            oneHtml += '</div>';
            $('#one').append(oneHtml);

            // 创建其他页面布局
            for (let i = 1; i <= numGroups; i++) {
                const pageHtml = `<div class="swiper-slide">
                                    <div style="width: 100%;height: 100%;position: relative;flex-direction: column;text-align: center;" id="page${i}"></div>
                                  </div>`;
                const startIndex = firstPageDivCount + (i - 1) * otherPageDivCount;
                const endIndex = startIndex + otherPageDivCount;
                const currentPageData = data.slice(startIndex, endIndex);
                
                // 如果有保存的布局，使用保存的布局
                if (savedLayouts[i]) {
                    const savedLayout = savedLayouts[i];
                    let dataHtml = `<div class="parent" id="one${i}">`;
                    savedLayout.forEach(item => {
                        if (item.type === "folder") {
                            dataHtml += `<div class="folder" id="${item.id}">
                                <div class="folder-icon">F</div>
                                <div class="folder-name">Folder</div>
                                <div class="folder-content"></div>
                                <div class="folder-popup"></div>
                            </div>`;
                        } else {
                            dataHtml += `<div class="app" id="${item.id}" data-id="${item.id}" data-url="${item.url}" data-in-dom="true" style="height:100%;margin-bottom:5%">
                                <div class="appClass">
                                    <div class="app-icon" style="background-image: url(${item.img})"></div>
                                    <div class="text">${item.hl}</div>
                                </div>
                            </div>`;
                        }
                    });
                    dataHtml += '</div>';
                    $('#sw').append(pageHtml);
                    this.$ele = $(`#page${i}`);
                    this.$ele.html(dataHtml);
                    
                    // 恢复文件夹内容
                    savedLayout.forEach(item => {
                        if (item.type === "folder" && item.apps && item.apps.length > 0) {
                            const folderElement = document.getElementById(item.id);
                            if (folderElement) {
                                const folderIcon = folderElement.querySelector(".folder-icon");
                                const folderContent = folderElement.querySelector(".folder-content");
                                const folderPopup = folderElement.querySelector(".folder-popup");
                                
                                // 清除默认的F图标
                                folderIcon.textContent = '';
                                
                                // 添加应用到文件夹
                                item.apps.forEach((app, index) => {
                                    // 创建应用元素
                                    const appElement = document.createElement("div");
                                    appElement.classList.add("app");
                                    appElement.id = `cloned-${app.id}-${Date.now()}`;
                                    appElement.dataset.id = app.id;
                                    appElement.dataset.url = app.url;
                                    appElement.dataset.inDom = "true";
                                    appElement.innerHTML = `
                                        <div class="appClass">
                                            <div class="app-icon" style="background-image: url(${app.img})"></div>
                                            <div class="text">${app.hl}</div>
                                        </div>
                                    `;
                                    
                                    // 创建应用图标并添加到文件夹图标区域
                                    const appIcon = document.createElement("div");
                                    appIcon.classList.add("app-icon");
                                    appIcon.style.backgroundImage = `url(${app.img})`;
                                    appIcon.style.position = "absolute";
                                    appIcon.style.left = `${(index % 3) * 15}px`;
                                    appIcon.style.top = `${Math.floor(index / 3) * 15}px`;
                                    appIcon.style.width = "15px";
                                    appIcon.style.height = "15px";
                                    appIcon.style.backgroundSize = "contain";
                                    folderIcon.appendChild(appIcon);
                                    
                                    // 添加到文件夹内容区域
                                    folderContent.appendChild(appElement);
                                    
                                    // 添加到文件夹弹出区域
                                    folderPopup.appendChild(appElement.cloneNode(true));
                                    
                                    // 为APP添加点击事件
                                    appElement.addEventListener("click", function(e) {
                                        e.stopPropagation();
                                        if (!longPressActivated) {
                                            // 尝试多种方式获取URL
                                            const url = this.dataset.url || this.getAttribute('data-url');
                                            console.log("点击文件夹内APP, URL:", url);
                                            if (url) {
                                                window.location.href = url;
                                            }
                                        }
                                    });
                                });
                            }
                        }
                    });
                    
                    // 为文件夹和普通APP添加点击事件
                    const folders = document.querySelectorAll(`#one${i} .folder`);
                    folders.forEach(folder => {
                        folder.addEventListener("click", function(e) {
                            e.stopPropagation();
                            if (!longPressActivated) {
                                openFolder(this);
                            }
                        });
                    });
                    
                    const apps = document.querySelectorAll(`#one${i} > .app`);
                    apps.forEach(app => {
                        app.addEventListener("click", function(e) {
                            e.stopPropagation();
                            if (!longPressActivated) {
                                // 尝试多种方式获取URL
                                const url = this.dataset.url || this.getAttribute('data-url');
                                console.log("点击APP, URL:", url);
                                if (url) {
                                    window.location.href = url;
                                }
                            }
                        });
                    });
                } else {
                    // 如果没有保存的布局，使用原始数据创建布局
                    let dataHtml = `<div class="parent" id="one${i}">`;
                    currentPageData.forEach(item => {
                        dataHtml += `<div class="app" id="app${item.id}" data-id="${item.id}" data-url="${item.url}" data-in-dom="true" style="height:100%;margin-bottom:5%">
                            <div class="appClass">
                                <div class="app-icon" style="background-image: url(${item.img})"></div>
                                <div class="text">${item.hl}</div>
                            </div>
                        </div>`;
                    });
                    dataHtml += '</div>';
                    $('#sw').append(pageHtml);
                    this.$ele = $(`#page${i}`);
                    this.$ele.html(dataHtml);
                    
                    // 为普通APP添加点击事件
                    const apps = document.querySelectorAll(`#one${i} .app`);
                    apps.forEach(app => {
                        app.addEventListener("click", function(e) {
                            e.stopPropagation();
                            if (!longPressActivated) {
                                // 尝试多种方式获取URL
                                const url = this.dataset.url || this.getAttribute('data-url');
                                console.log("点击APP, URL:", url);
                                if (url) {
                                    window.location.href = url;
                                }
                            }
                        });
                    });
                }
                this.bind(i);
            }

            let swiper;  // Define swiper as a variable accessible within the scope
            
            swiper = new Swiper('.swiper-container', {
                pagination: {
                    el: ".swiper-pagination",
                    dynamicBullets: true,
                },
                allowTouchMove: true,
                on: {
                    touchStart: function(swiper, event) {
                        if (longPressActivated) {
                            swiper.allowTouchMove = false;
                        } else {
                            swiper.allowTouchMove = true;
                        }
                    },
                    touchMove: function(swiper, event) {
                        // 额外检查，确保在长按状态下禁用滑动
                        if (longPressActivated) {
                            swiper.allowTouchMove = false;
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    }
                }
            });
        },
        bind: function (i) {
            const desktopManager = initDesktopManager(`one${i}`);
            $('.parent').longPress(function () {
                // 激活编辑模式背景
                editModeBg.classList.add('active');
                
                // 显示删除按钮并添加动画类
                $('.app').each(function () {
                    var $appIcon = $(this).find(".app-icon");
                    if ($appIcon.find(".delbook").length === 0) {
                        $appIcon.prepend('<div class="delbook"></div>');
                    }
                    $appIcon.find(".delbook").addClass('show');
                });
                
                // 添加可移动类
                $('.app, .folder').addClass('movable');
                
                longPressActivated = true;
                
                // 立即禁用Swiper导航
                if (typeof swiper !== 'undefined') {
                    swiper.allowTouchMove = false;
                    swiper.params.touchReleaseOnEdges = false;
                    swiper.params.threshold = 999; // 设置一个非常高的阈值，实际上禁用了滑动
                    swiper.update(); // 更新Swiper配置
                }
                
                // 阻止页面滚动
                document.body.style.overflow = 'hidden';
                
                desktopManager.init();
            });
            
            // 在触摸开始时额外检查
            $(document).on('touchstart', function(e) {
                if (longPressActivated) {
                    // 如果在编辑模式下，阻止所有非APP元素的默认触摸行为
                    if (!$(e.target).closest('.app, .folder, .delbook').length) {
                        e.preventDefault();
                    }
                }
            });
            
            $(document).on('touchstart', '.delbook', function (e) {
                e.stopPropagation();
                $(this).closest('.app').remove();
            });
            
            $(document).on('click', function (evt) {
                if (!$(evt.target).closest('.appClass').length && longPressActivated) {
                    // 移除删除按钮的显示状态
                    $('.delbook').removeClass('show');
                    
                    // 移除编辑模式背景
                    editModeBg.classList.remove('active');
                    
                    // 移除可移动类
                    $('.app, .folder').removeClass('movable');
                    
                    longPressActivated = false;
                    
                    // 重新启用Swiper导航
                    if (typeof swiper !== 'undefined') {
                        swiper.allowTouchMove = true;
                        swiper.params.touchReleaseOnEdges = true;
                        swiper.params.threshold = 0; // 恢复正常阈值
                        swiper.update(); // 更新Swiper配置
                    }
                    
                    // 恢复页面滚动
                    document.body.style.overflow = '';
                }
            });
        }
    };
    $.fn.longPress = function (fn) {
        var timeout = void 0,
            $this = this,
            startPos,
            movePos,
            endPos;
        for (var i = $this.length - 1; i > -1; i--) {
            $this[i].addEventListener("touchstart", function (e) {
                var touch = e.targetTouches[0];
                startPos = {x: touch.pageX, y: touch.pageY};
                timeout = setTimeout(function () {
                    if ($this.attr("disabled") === undefined) {
                        fn();
                    }
                }, 700);
            }, {passive: true});
            $this[i].addEventListener("touchmove", function (e) {
                var touch = e.targetTouches[0];
                movePos = {x: touch.pageX - startPos.x, y: touch.pageY - startPos.y};
                (Math.abs(movePos.x) > 10 || Math.abs(movePos.y) > 10) && clearTimeout(timeout);
            }, {passive: true});
            $this[i].addEventListener("touchend", function () {
                clearTimeout(timeout);
            }, {passive: true});
        }
    };

    function initDesktopManager(id) {
        console.log('初始化桌面管理器>>>> ' + id);

        function init() {
            const desktop = document.getElementById(id);
            if (!desktop) {
                console.error('未找到指定 ID 的桌面元素');
                return;
            }

            // 加载保存的布局
            loadLayout(desktop);

            let draggedApp = null;
            let startX, startY;
            let originalX, originalY;
            let rafId = null;
            let debounceTimer;
            let hoverTimer = null;
            let hoveredElement = null;
            const THRESHOLD = 20;
            desktop.addEventListener("mousedown", handleStart, false);
            desktop.addEventListener("touchstart", handleStart, {passive: false});

            function handleStart(e) {
                const target = e.target.closest(".app, .folder");
                if (!target) return;
                
                // Only allow dragging when longPressActivated is true
                if (!longPressActivated) {
                    return;
                }
                
                e.preventDefault();
                e.stopPropagation(); // 阻止冒泡，防止触发swiper
                
                draggedApp = target;
                const touch = e.touches ? e.touches[0] : e;
                startX = touch.clientX;
                startY = touch.clientY;
                const rect = draggedApp.getBoundingClientRect();
                originalX = rect.left;
                originalY = rect.top;
                draggedApp.style.zIndex = "1000";
                draggedApp.style.transition = "none";
                draggedApp.style.opacity = "0.8";
                document.querySelectorAll(".delbook").forEach(delIcon => {
                    delIcon.style.display = 'none';
                });
                document.addEventListener("mousemove", handleMove, false);
                document.addEventListener("touchmove", handleMove, {passive: false});
                document.addEventListener("mouseup", handleEnd, false);
                document.addEventListener("touchend", handleEnd, false);
                
                // 确保Swiper被禁用
                if (typeof swiper !== 'undefined') {
                    swiper.allowTouchMove = false;
                    swiper.update();
                }
            }

            function handleMove(e) {
                if (!draggedApp || !longPressActivated) return;
                e.preventDefault();
                e.stopPropagation(); // 阻止事件冒泡，防止触发swiper切换
                
                // 再次确保Swiper被禁用
                if (typeof swiper !== 'undefined') {
                    swiper.allowTouchMove = false;
                }
                
                hide();
                const touch = e.touches ? e.touches[0] : e;
                const currentX = touch.clientX;
                const currentY = touch.clientY;
                const deltaX = currentX - startX;
                const deltaY = currentY - startY;
                let direction = null;
                if (Math.abs(deltaX) > THRESHOLD) {
                    direction = deltaX > 0 ? 'right' : 'left';
                }
                if (direction) {
                    switch (direction) {
                        case 'left':
                            console.log("向左");
                            break;
                        case 'right':
                            console.log("向右");
                            break;
                    }
                }
                cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => moveAt(touch.clientX, touch.clientY));
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    if (!draggedApp) return;
                    const otherElements = Array.from(desktop.querySelectorAll(".app, .folder")).filter(elem => elem !== draggedApp);
                    detectCollision(draggedApp, direction, otherElements, collisionElement => {
                        if (collisionElement) {
                            if (draggedApp.classList.contains("app") && collisionElement.classList.contains("app")) {
                                createFolder([draggedApp, collisionElement]);
                            } else if (draggedApp.classList.contains("app") && collisionElement.classList.contains("folder")) {
                                console.log(">>>>>添加了")
                                addToFolder(draggedApp, collisionElement);
                            }
                        }
                    });
                }, 50);
                //console.log(">>>>>>>> 这个是什么")
            }

            function handleEnd(e) {
                if (!draggedApp) return;
                let endX, endY;
                if (e.touches) {
                    endX = e.changedTouches[0].clientX;
                    endY = e.changedTouches[0].clientY;
                } else {
                    endX = e.clientX;
                    endY = e.clientY;
                }
                const deltaX = Math.abs(endX - startX);
                const deltaY = Math.abs(endY - startY);
                const MOVE_THRESHOLD = 50;
                
                // 防止触发点击事件
                e.preventDefault();
                e.stopPropagation();
                
                // Always hide the delete buttons after a move attempt
                hide();
                
                // If the app was moved significantly, exit the long-press state
                if (deltaX >= MOVE_THRESHOLD || deltaY >= MOVE_THRESHOLD) {
                    console.log("结束 >>>");
                    $('.app, .folder').removeClass('movable');
                    // 移除编辑模式背景
                    editModeBg.classList.remove('active');
                    longPressActivated = false;
                    
                    // 重新启用Swiper导航
                    if (typeof swiper !== 'undefined') {
                        swiper.allowTouchMove = true;
                        swiper.params.touchReleaseOnEdges = true;
                        swiper.params.threshold = 0;
                        swiper.update();
                    }
                    
                    // 恢复页面滚动
                    document.body.style.overflow = '';
                }
                
                cancelAnimationFrame(rafId);
                clearTimeout(hoverTimer);
                hoveredElement = null;
                draggedApp.style.zIndex = "";
                draggedApp.style.transform = "";
                draggedApp.style.transition = "transform 0.23s ease";
                draggedApp.style.opacity = "1";
                document.querySelectorAll(".collision").forEach(el => el.classList.remove("collision"));
                draggedApp = null;
                document.removeEventListener("mousemove", handleMove);
                document.removeEventListener("touchmove", handleMove);
                document.removeEventListener("mouseup", handleEnd);
                document.removeEventListener("touchend", handleEnd);
                saveLayout();
                console.log("移动结束 >>>")
            }

            function moveAt(clientX, clientY) {
                if (!draggedApp) return;
                const deltaX = clientX - startX;
                const deltaY = clientY - startY;
                draggedApp.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
            }

            function detectCollision(draggedElement, direction, elements, callback) {
                console.log(">>>>>>>>>检测碰撞");
                const draggedRect = draggedElement.querySelector(".appClass .app-icon").getBoundingClientRect();
                const draggedCenter = {
                    x: draggedRect.left + draggedRect.width / 2,
                    y: draggedRect.top + draggedRect.height / 2
                };
                let closestElement;

                elements.forEach(element => {
                    const target = element.classList.contains("folder") ? element.querySelector(".folder-icon") : element.querySelector(".appClass");
                    const elementRect = target.getBoundingClientRect();
                    if (isColliding(draggedRect, elementRect)) {
                        console.log("满足碰撞条件");
                        let hasPassedCenter = false;
                        if (direction === 'left') {
                            if (draggedRect.right < elementRect.left + (elementRect.width / 2)) {
                                hasPassedCenter = true;
                            }
                        } else if (direction === 'right') {
                            if (draggedRect.left > elementRect.left + (elementRect.width / 2)) {
                                hasPassedCenter = true;
                            }
                        }
                        if (hasPassedCenter) {
                            console.log(`已超过目标元素中心的阈值，准备交换位置: ${direction}`);
                            swapElements(draggedElement, element);
                            return; // 交换后直接返回，避免重复处理
                        }

                        const elementCenter = {
                            x: elementRect.left + elementRect.width / 2,
                            y: elementRect.top + elementRect.height / 2
                        };
                        const deltaX = Math.abs(draggedCenter.x - elementCenter.x);
                        const deltaY = Math.abs(draggedCenter.y - elementCenter.y);
                        const thresholdX = elementRect.width * 0.5;
                        const thresholdY = elementRect.height * 0.5;
                        const isCenterProximity = deltaX <= thresholdX && deltaY <= thresholdY;

                        if (isCenterProximity) {
                            closestElement = element;
                        }
                    }
                });

                if (closestElement && closestElement !== draggedElement) {
                    if (closestElement !== hoveredElement) {
                        clearTimeout(hoverTimer);
                        hoveredElement = closestElement;
                        hoverTimer = setTimeout(() => {
                            callback(hoveredElement);
                        }, 800);
                    }
                    closestElement.classList.add("collision");
                    console.log("存在碰撞元素，等待合并操作");
                } else {
                    clearTimeout(hoverTimer);
                    hoveredElement = null;
                    elements.forEach(el => el.classList.remove("collision"));
                }
            }


            function isColliding(rectA, rectB) {
                return !(
                    rectA.right < rectB.left ||
                    rectA.left > rectB.right ||
                    rectA.bottom < rectB.top ||
                    rectA.top > rectB.bottom
                );
            }

            function createFolder(apps) {
                const folder = document.createElement("div");
                folder.classList.add("folder");
                folder.id = `folder-${Date.now()}`;
                folder.innerHTML = `
                    <div class="folder-icon">F</div>
                    <div class="folder-name">Folder</div>
                    <div class="folder-content"></div>
                    <div class="folder-popup"></div>
                `;
                const folderIcon = folder.querySelector(".folder-icon");
                const folderContent = folder.querySelector(".folder-content");
                const folderPopup = folder.querySelector(".folder-popup");

                const validApps = apps.filter(app => app && app instanceof HTMLElement && app.parentNode);
                if (validApps.length === 0) {
                    console.warn("没有有效的 app 元素可用于创建文件夹");
                    return;
                }

                validApps.slice(0, 9).forEach((app, index) => {
                    if (!app.dataset.removed) {
                        const appIcon = app.querySelector(".app-icon").cloneNode(true);
                        const clonedApp = app.cloneNode(true);
                        clonedApp.id = `cloned-${app.id}-${Date.now()}`;
                        appIcon.style.left = `${(index % 3) * 15}px`;
                        appIcon.style.top = `${Math.floor(index / 3) * 15}px`;
                        appIcon.style.width = "15px";
                        appIcon.style.height = "15px";
                        folderIcon.appendChild(appIcon);
                        folderContent.appendChild(clonedApp);
                        folderPopup.appendChild(clonedApp.cloneNode(true));
                        if (app.parentNode) {
                            app.parentNode.removeChild(app);
                            app.dataset.removed = "true";
                        } else {
                            console.warn("无法移除 app，因为它没有父节点:", app);
                        }
                    }
                });

                desktop.appendChild(folder);
                draggedApp = folder;
                updateAppPositions();
                folder.addEventListener("click", handleFolderInteraction);
                folder.addEventListener("touchstart", handleFolderInteraction);
                console.log("合并完成  >>>>");
                
                // 退出编辑模式
                $('.app, .folder').removeClass('movable');
                $('.delbook').removeClass('show');
                editModeBg.classList.remove('active');
                longPressActivated = false;
                
                // 重新启用Swiper导航
                if (typeof swiper !== 'undefined') {
                    swiper.allowTouchMove = true;
                    swiper.params.touchReleaseOnEdges = true;
                    swiper.params.threshold = 0;
                    swiper.update();
                }
                
                // 恢复页面滚动
                document.body.style.overflow = '';
                
                saveLayout();
                return folder;
            }

            function addToFolder(app, folder) {
                const folderIcon = folder.querySelector(".folder-icon");
                const folderContent = folder.querySelector(".folder-content");
                const folderPopup = folder.querySelector(".folder-popup");
                const appIcons = folderIcon.querySelectorAll(".app-icon");

                const appId = app.dataset.id;
                const existingApp = folderContent.querySelector(`[data-id="${appId}"]`);
                if (existingApp) {
                    console.log(`应用 ${appId} 已存在于文件夹中，跳过添加`);
                    return;
                }

                if (appIcons.length < 9) {
                    const appIcon = app.querySelector(".app-icon").cloneNode(true);
                    const clonedApp = app.cloneNode(true);
                    clonedApp.id = `cloned-${app.id}-${Date.now()}`;
                    appIcon.style.left = `${(appIcons.length % 3) * 15}px`;
                    appIcon.style.top = `${Math.floor(appIcons.length / 3) * 15}px`;
                    appIcon.style.width = "15px";
                    appIcon.style.height = "15px";

                    folderIcon.appendChild(appIcon);
                    folderContent.appendChild(clonedApp);
                    folderPopup.appendChild(clonedApp.cloneNode(true));

                    if (app.parentNode) {
                        app.parentNode.removeChild(app);
                        app.dataset.removed = "true";
                    } else {
                        console.warn("无法移除 app，因为它没有父节点:", app);
                    }

                    draggedApp = folder;
                    folder.addEventListener("click", handleFolderInteraction);
                    folder.addEventListener("touchstart", handleFolderInteraction);

                    console.log(`成功将应用 ${appId} 添加到文件夹`);
                    
                    // 退出编辑模式
                    $('.app, .folder').removeClass('movable');
                    $('.delbook').removeClass('show');
                    editModeBg.classList.remove('active');
                    longPressActivated = false;
                    
                    // 重新启用Swiper导航
                    if (typeof swiper !== 'undefined') {
                        swiper.allowTouchMove = true;
                        swiper.params.touchReleaseOnEdges = true;
                        swiper.params.threshold = 0;
                        swiper.update();
                    }
                    
                    // 恢复页面滚动
                    document.body.style.overflow = '';
                    
                    saveLayout();
                } else {
                    console.log("文件夹已满，无法添加更多应用");
                }
            }

            function swapElements(elem1, elem2) {
                const rect1 = elem1.getBoundingClientRect();
                const rect2 = elem2.getBoundingClientRect();
                const tempElem = document.createElement("div");
                elem1.parentNode.insertBefore(tempElem, elem1);
                elem2.parentNode.insertBefore(elem1, elem2);
                tempElem.parentNode.insertBefore(elem2, tempElem);
                tempElem.parentNode.removeChild(tempElem);
                updateAppPositions();
                const deltaX1 = rect2.left - rect1.left;
                const deltaY1 = rect2.top - rect1.top;
                const deltaX2 = rect1.left - rect2.left;
                const deltaY2 = rect1.top - rect2.top;
                elem1.style.transform = `translate3d(${deltaX1}px, ${deltaY1}px, 0)`;
                elem2.style.transform = `translate3d(${deltaX2}px, ${deltaY2}px, 0)`;
                elem1.style.transition = "none";
                elem2.style.transition = "none";
                elem1.offsetHeight;
                elem2.offsetHeight;
                requestAnimationFrame(() => {
                    elem1.style.transition = "transform 0.3s ease";
                    elem2.style.transition = "transform 0.3s ease";
                    elem1.style.transform = "";
                    elem2.style.transform = "";
                });

                function onTransitionEnd() {
                    elem1.style.transition = "";
                    elem2.style.transition = "";
                    elem1.removeEventListener("transitionend", onTransitionEnd);
                    saveLayout();
                    
                    // 在交换动画结束后，如果用户已退出编辑模式，恢复Swiper功能
                    if (!longPressActivated) {
                        // 重新启用Swiper导航
                        if (typeof swiper !== 'undefined') {
                            swiper.allowTouchMove = true;
                            swiper.params.touchReleaseOnEdges = true;
                            swiper.params.threshold = 0;
                            swiper.update();
                        }
                        
                        // 恢复页面滚动
                        document.body.style.overflow = '';
                    }
                }

                elem1.addEventListener("transitionend", onTransitionEnd);
                draggedApp = null;
                longPressActivated = false;
                
                // 退出编辑模式
                $('.delbook').removeClass('show');
                $('.app, .folder').removeClass('movable');
                editModeBg.classList.remove('active');
                
                hide();
            }

            function updateAppPositions() {
                const apps = document.querySelectorAll(".app");
                apps.forEach((app) => {
                    app.rect = app.getBoundingClientRect();
                });
            }

            function hide() {
                document.querySelectorAll(".delbook").forEach(delIcon => {
                    delIcon.classList.remove('show');
                });
            }

            function show() {
                document.querySelectorAll(".delbook").forEach(delIcon => {
                    delIcon.classList.add('show');
                });
            }

            function handleFolderInteraction(e) {
                e.preventDefault();
                e.stopPropagation();
                if (e.type === "touchstart" && e.touches.length > 1) {
                    return;
                }
                openFolder(this);
            }

            function loadLayout(desktop) {
                const savedLayout = store.get(`desktopLayout_${id}`);
                if (!savedLayout) return;

                // 清除现有的所有元素
                while (desktop.firstChild) {
                    desktop.removeChild(desktop.firstChild);
                }

                // 按照保存的布局重新创建元素
                savedLayout.forEach(item => {
                    if (item.type === "folder") {
                        const folder = document.createElement("div");
                        folder.classList.add("folder");
                        folder.id = item.id;
                        folder.innerHTML = `
                            <div class="folder-icon">F</div>
                            <div class="folder-name">Folder</div>
                            <div class="folder-content"></div>
                            <div class="folder-popup"></div>
                        `;
                        desktop.appendChild(folder);
                        
                        // 为文件夹添加点击事件
                        folder.addEventListener("click", function(e) {
                            e.stopPropagation();
                            if (!longPressActivated) {
                                openFolder(this);
                            }
                        });

                        // 恢复文件夹中的应用
                        const folderContent = folder.querySelector(".folder-content");
                        const folderIcon = folder.querySelector(".folder-icon");
                        const folderPopup = folder.querySelector(".folder-popup");

                        item.apps.forEach((app, index) => {
                            const appElement = createAppElement(app);
                            const appIcon = appElement.querySelector(".app-icon").cloneNode(true);
                            appIcon.style.left = `${(index % 3) * 15}px`;
                            appIcon.style.top = `${Math.floor(index / 3) * 15}px`;
                            appIcon.style.width = "15px";
                            appIcon.style.height = "15px";
                            folderIcon.appendChild(appIcon);
                            folderContent.appendChild(appElement);
                            folderPopup.appendChild(appElement.cloneNode(true));
                            
                            // 为文件夹内的应用添加点击事件
                            appElement.addEventListener("click", function(e) {
                                e.stopPropagation();
                                if (!longPressActivated) {
                                    // 尝试多种方式获取URL
                                    const url = this.dataset.url || this.getAttribute('data-url');
                                    console.log("点击文件夹内APP, URL:", url);
                                    if (url) {
                                        window.location.href = url;
                                    }
                                }
                            });
                        });
                    } else {
                        const appElement = createAppElement(item);
                        desktop.appendChild(appElement);
                        
                        // 为普通应用添加点击事件
                        appElement.addEventListener("click", function(e) {
                            e.stopPropagation();
                            if (!longPressActivated) {
                                // 尝试多种方式获取URL
                                const url = this.dataset.url || this.getAttribute('data-url');
                                console.log("点击APP, URL:", url);
                                if (url) {
                                    window.location.href = url;
                                }
                            }
                        });
                    }
                });
            }

            function createAppElement(appData) {
                const app = document.createElement("div");
                app.classList.add("app");
                app.id = appData.id;
                app.dataset.id = appData.id;
                app.dataset.url = appData.url;
                app.dataset.inDom = "true";
                app.innerHTML = `
                    <div class="appClass">
                        <div class="app-icon" style="background-image: url(${appData.img})"></div>
                        <div class="text">${appData.hl}</div>
                    </div>
                `;
                return app;
            }

            function saveLayout() {
                const layout = Array.from(desktop.children).map((elem) => {
                    if (elem.classList.contains("folder")) {
                        const apps = Array.from(elem.querySelector(".folder-content").children).map(app => ({
                            id: app.dataset.id,
                            url: app.dataset.url,
                            img: app.querySelector(".app-icon").style.backgroundImage.replace(/url\(['"](.+)['"]\)/, '$1'),
                            hl: app.querySelector(".text").textContent
                        }));
                        return {
                            type: "folder",
                            id: elem.id,
                            apps: apps,
                            position: Array.from(desktop.children).indexOf(elem),
                        };
                    } else {
                        return {
                            type: "app",
                            id: elem.id,
                            url: elem.dataset.url,
                            img: elem.querySelector(".app-icon").style.backgroundImage.replace(/url\(['"](.+)['"]\)/, '$1'),
                            hl: elem.querySelector(".text").textContent,
                            position: Array.from(desktop.children).indexOf(elem),
                        };
                    }
                });
                store.set(`desktopLayout_${id}`, layout);
            }
        }

        const api = {
            init: init
        };
        return api;
    }

    const bookMark = new bookMarkFn({data: store.get("page")});
});