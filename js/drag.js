function initDesktopManager(id) {
    console.log('初始化桌面管理器>>>> ' + id);

    function init() {
        const desktop = document.getElementById(id);
        if (!desktop) {
            console.error('未找到指定 ID 的桌面元素');
            return;
        }

        let draggedApp = null;
        let startX, startY;
        let originalX, originalY;
        let rafId = null;
        let debounceTimer;
        let hoverTimer = null;
        let hoveredElement = null;

        const THRESHOLD = 20; // 移动阈值

        desktop.addEventListener("mousedown", handleStart, false);
        desktop.addEventListener("touchstart", handleStart, {passive: false});

        function handleStart(e) {
            const target = e.target.closest(".app, .folder");
            if (!target) return;

            e.preventDefault();
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

            document.addEventListener("mousemove", handleMove, false);
            document.addEventListener("touchmove", handleMove, {passive: false});
            document.addEventListener("mouseup", handleEnd, false);
            document.addEventListener("touchend", handleEnd, false);

            rafId = requestAnimationFrame(() => moveAt(touch.clientX, touch.clientY));
        }

        function handleMove(e) {
            if (!draggedApp) return;
            e.preventDefault();

            const touch = e.touches ? e.touches[0] : e;

            // 获取当前触摸点的位置
            const currentX = touch.clientX;
            const currentY = touch.clientY;

            // 计算移动量
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;

            // 判断主要移动方向
            let direction = null;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (Math.abs(deltaX) > THRESHOLD) {
                    direction = deltaX > 0 ? 'right' : 'left';
                }
            } else {
                if (Math.abs(deltaY) > THRESHOLD) {
                    direction = deltaY > 0 ? 'down' : 'up';
                }
            }

            if (direction) {
                // 根据方向执行相应的操作
                switch(direction) {
                    case 'left':
                        switchPage('next');
                        console.log("向左")
                        break;
                    case 'right':
                        console.log("向右")
                        switchPage('prev');
                        break;
                    // 您可以根据需要添加上下滑动的操作
                    case 'up':
                        console.log("向上")
                        // 上滑操作
                        break;
                    case 'down':
                        console.log("向下")
                        // 下滑操作
                        break;
                }
            }

            // 处理移动逻辑
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => moveAt(touch.clientX, touch.clientY));

            // 保持原有的合并逻辑
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (!draggedApp) return;

                const otherElements = Array.from(desktop.querySelectorAll(".app, .folder")).filter(elem => elem !== draggedApp);
                detectCollision(draggedApp, direction, otherElements, collisionElement => {
                    if (collisionElement) {
                        if (draggedApp.classList.contains("app") && collisionElement.classList.contains("app")) {
                            createFolder([draggedApp, collisionElement]);
                        } else if (draggedApp.classList.contains("app") && collisionElement.classList.contains("folder")) {
                            addToFolder(draggedApp, collisionElement);
                        }
                    }
                });
            }, 50); // Debounce time
        }


        // 切换页面的函数
        function switchPage(direction) {
            const swiper = document.querySelector('.swiper-container').swiper; // 获取 Swiper 实例
            if (direction === 'prev') {
                swiper.slidePrev();
            } else if (direction === 'next') {
                swiper.slideNext();
            }
        }


        function handleEnd() {
            if (!draggedApp) return;

            cancelAnimationFrame(rafId);
            clearTimeout(hoverTimer);
            hoveredElement = null;
            draggedApp.style.zIndex = "";
            draggedApp.style.transform = "";
            draggedApp.style.transition = "transform 0.2s ease";
            draggedApp.style.opacity = "1";

            document.querySelectorAll(".collision").forEach(el => el.classList.remove("collision"));
            draggedApp = null;

            document.removeEventListener("mousemove", handleMove);
            document.removeEventListener("touchmove", handleMove);
            document.removeEventListener("mouseup", handleEnd);
            document.removeEventListener("touchend", handleEnd);

            saveLayout();
        }

        function moveAt(clientX, clientY) {
            if (!draggedApp) return;
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            const gridSize = 0.1;
            const alignedX = Math.round(deltaX / gridSize) * gridSize;
            const alignedY = Math.round(deltaY / gridSize) * gridSize;
            draggedApp.style.transform = `translate3d(${alignedX}px, ${alignedY}px, 0)`;
        }

        function detectCollision(draggedElement, direction, elements, callback) {
            const draggedRect = draggedElement.querySelector(".appClass .app-icon").getBoundingClientRect();
            const draggedCenter = {
                x: draggedRect.left + draggedRect.width / 2,
                y: draggedRect.top + draggedRect.height / 2
            };

            let closestElement;

            elements.forEach(element => {
                const elementRect = element.querySelector(".appClass .app-icon").getBoundingClientRect();
                if (isColliding(draggedRect, elementRect)) {
                    console.log("满足APP");

                    // 根据方向判断是否超过中心点的阈值
                    let hasPassedCenter = false;

                    if (direction === 'left') {
                        if (draggedRect.right < elementRect.left + (elementRect.width / 2)) {
                            hasPassedCenter = true;
                        }
                    } else if (direction === 'right') {
                        if (draggedRect.left > elementRect.left + (elementRect.width / 2)) {
                            hasPassedCenter = true;
                        }
                    } else if (direction === 'up') {
                        if (draggedRect.bottom < elementRect.top + (elementRect.height / 2)) {
                            hasPassedCenter = true;
                        }
                    } else if (direction === 'down') {
                        if (draggedRect.top > elementRect.top + (elementRect.height / 2)) {
                            hasPassedCenter = true;
                        }
                    }


                    // 如果超过阈值，触发交换
                    if (hasPassedCenter) {
                        console.log(`已超过目标元素中心的阈值，准备交换位置: ${direction}`);
                        swapElements(draggedElement, element);
                    }

                    // 计算两个元素的中心点
                    const elementCenter = {
                        x: elementRect.left + elementRect.width / 2,
                        y: elementRect.top + elementRect.height / 2
                    };

                    // 计算中心点之间的距离
                    const deltaX = Math.abs(draggedCenter.x - elementCenter.x);
                    const deltaY = Math.abs(draggedCenter.y - elementCenter.y);

                    // 设定阈值为目标元素宽度和高度的0.5倍
                    const thresholdX = elementRect.width * 0.5;
                    const thresholdY = elementRect.height * 0.5;

                    const isCenterProximity = deltaX <= thresholdX && deltaY <= thresholdY;
                    console.log("中心位置判断 :"+isCenterProximity)
                    if (isCenterProximity){
                        closestElement = element;
                    }
                }
            });

            if (closestElement) {
                if (closestElement !== hoveredElement) {
                    clearTimeout(hoverTimer);
                    hoveredElement = closestElement;
                    hoverTimer = setTimeout(() => {
                        callback(hoveredElement);
                    }, 600);
                }
                closestElement.classList.add("collision");
                console.log("存在碰撞元素，等待合并操作");
            } else {
                clearTimeout(hoverTimer);
                hoveredElement = null;
                elements.forEach(el => el.classList.remove("collision"));
            }
        }


        // 碰撞检测函数
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
            folder.innerHTML = `
                <div class="folder-icon">F</div>
                <div class="folder-name">Folder</div>
                <div class="folder-content"></div>
                <div class="folder-popup"></div>
            `;

            const folderIcon = folder.querySelector(".folder-icon");
            const folderContent = folder.querySelector(".folder-content");
            const folderPopup = folder.querySelector(".folder-popup");

            apps.slice(0, 9).forEach((app, index) => {
                const appIcon = app.querySelector(".app-icon").cloneNode(true);
                const clonedApp = app.cloneNode(true);
                clonedApp.id = `cloned-${app.id}-${Date.now()}`;
                appIcon.style.left = `${(index % 3) * 20}px`;
                appIcon.style.top = `${Math.floor(index / 3) * 20}px`;
                folderIcon.appendChild(appIcon);
                folderContent.appendChild(clonedApp);
                folderPopup.appendChild(clonedApp.cloneNode(true));
                app.parentNode.removeChild(app);
            });

            desktop.appendChild(folder);
            draggedApp = folder;
            folder.addEventListener("click", handleFolderInteraction);
            folder.addEventListener("touchstart", handleFolderInteraction);

            return folder;
        }

        function addToFolder(app, folder) {
            const folderIcon = folder.querySelector(".folder-icon");
            const folderContent = folder.querySelector(".folder-content");
            const folderPopup = folder.querySelector(".folder-popup");
            const appIcons = folderIcon.querySelectorAll(".app-icon");
            if (appIcons.length < 9) {
                const appIcon = app.querySelector(".app-icon").cloneNode(true);
                const clonedApp = app.cloneNode(true);
                clonedApp.id = `cloned-${app.id}-${Date.now()}`;
                appIcon.style.left = `${(appIcons.length % 3) * 20}px`;
                appIcon.style.top = `${Math.floor(appIcons.length / 3) * 20}px`;
                folderIcon.appendChild(appIcon);
                folderContent.appendChild(clonedApp);
                folderPopup.appendChild(clonedApp.cloneNode(true));
                app.parentNode.removeChild(app);
                draggedApp = folder;
                folder.addEventListener("click", handleFolderInteraction);
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

            // 计算偏移量
            const deltaX1 = rect2.left - rect1.left;
            const deltaY1 = rect2.top - rect1.top;
            const deltaX2 = rect1.left - rect2.left;
            const deltaY2 = rect1.top - rect2.top;

            // 应用动画
            elem1.style.transform = `translate3d(${deltaX1}px, ${deltaY1}px, 0)`;
            elem2.style.transform = `translate3d(${deltaX2}px, ${deltaY2}px, 0)`;

            elem1.style.transition = "transform 0.2s ease";
            elem2.style.transition = "transform 0.2s ease";

            requestAnimationFrame(() => {
                elem1.style.transform = "";
                elem2.style.transform = "";
            });

            // 重置拖动状态
            draggedApp = null;
        }






        function handleFolderInteraction(e) {
            e.preventDefault();
            e.stopPropagation();

            if (e.type === "touchstart" && e.touches.length > 1) {
                return;
            }

            toggleFolderPopup(this);
        }

        function toggleFolderPopup(folder) {
            const folderPopup = folder.querySelector(".folder-popup");
            folderPopup.classList.toggle("open");
            if (folderPopup.classList.contains("open")) {
                folder.getBoundingClientRect();
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
                });
            }
        }

        document.addEventListener("click", (e) => {
            const openFolders = document.querySelectorAll(".folder-popup.open");
            openFolders.forEach((folder) => {
                if (!folder.contains(e.target)) {
                    folder.classList.remove("open");
                }
            });
        });

        function saveLayout() {
            const layout = Array.from(desktop.children).map((elem) => {
                if (elem.classList.contains("folder")) {
                    const apps = Array.from(elem.querySelector(".folder-content").children).map(app => app.id);
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
                        position: Array.from(desktop.children).indexOf(elem),
                    };
                }
            });

            localStorage.setItem("desktopLayout", JSON.stringify(layout));
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
