let longPressActivated = false;
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
            let oneHtml = '<div style="min-height: 70px;flex: 1;display: flex;flex-wrap:wrap;">';
            for (let i = 0; i < firstPageDivCount && i < totalCount; i++) {
                oneHtml += `<div style="height:100%;flex: 0 0 25%;margin-bottom:5%">
                              <div class="img" style="background-image: url(${data[i].img})"></div>
                              <div class="text">${data[i].hl}</div>
                            </div>`;
            }
            oneHtml += '</div>';
            $('#one').append(oneHtml);
            for (let i = 1; i <= numGroups; i++) {
                const pageHtml = `<div class="swiper-slide">
                                    <div style="width: 100%;height: 100%;position: relative;flex-direction: column;text-align: center;" id="page${i}"></div>
                                  </div>`;
                const startIndex = firstPageDivCount + (i - 1) * otherPageDivCount;
                const endIndex = startIndex + otherPageDivCount;
                const currentPageData = data.slice(startIndex, endIndex);
                let dataHtml = `<div class="parent" id="one${i}">`;
                currentPageData.forEach(item => {
                    dataHtml += `<div class="app" id="app${item.id}" data-id="${item.id}" data-url="${item.url}" style="height:100%;margin-bottom:5%">
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
                this.bind(i);
            }
            const swiper = new Swiper('.swiper-container', {
                pagination: {
                    el: ".swiper-pagination",
                    dynamicBullets: true,
                }
            });
        },
        bind: function (i) {
            const desktopManager = initDesktopManager(`one${i}`);
            $('.parent').longPress(function () {
                $('.delbook').show();
                $('.app').each(function() {
                    var $appIcon = $(this).find(".app-icon");
                    if ($appIcon.find(".delbook").length === 0) {
                        $appIcon.prepend('<div class="delbook"></div>');
                    }
                });
                longPressActivated = true;
                desktopManager.init();
            });
            $(document).on('touchstart', '.delbook', function(e) {
                e.stopPropagation();
                $(this).closest('.app').remove();
            });
            $(document).on('click', function(evt) {
                if (!$(evt.target).closest('.appClass').length && longPressActivated) {
                    $('.delbook').hide();
                    longPressActivated = false;
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
                document.querySelectorAll(".delbook").forEach(delIcon => {
                    delIcon.style.display = 'none';
                });
                document.addEventListener("mousemove", handleMove, false);
                document.addEventListener("touchmove", handleMove, {passive: false});
                document.addEventListener("mouseup", handleEnd, false);
                document.addEventListener("touchend", handleEnd, false);
            }
            function handleMove(e) {
                if (!draggedApp || !longPressActivated) return;
                e.preventDefault();
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
                                addToFolder(draggedApp, collisionElement);
                            }
                        }
                    });
                }, 50);
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
                if (deltaX >= MOVE_THRESHOLD || deltaY >= MOVE_THRESHOLD) {
                    console.log("结束 >>>");
                    hide();
                    longPressActivated = false;
                } else {
                    show();
                    longPressActivated = true;
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
            }
            function moveAt(clientX, clientY) {
                if (!draggedApp) return;
                const deltaX = clientX - startX;
                const deltaY = clientY - startY;
                draggedApp.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
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
                        console.log("中心位置判断 :" + isCenterProximity)
                        if (isCenterProximity) {
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
                }
                elem1.addEventListener("transitionend", onTransitionEnd);
                draggedApp = null;
                longPressActivated = false;
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
                    delIcon.style.display = 'none';
                });
            }
            function show() {
                document.querySelectorAll(".delbook").forEach(delIcon => {
                    delIcon.style.display = 'block';
                });
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
        const api = {
            init: init
        };
        return api;
    }
    const bookMark = new bookMarkFn({ data: store.get("page") });
});
