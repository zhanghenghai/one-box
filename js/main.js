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
            url: "http://localhost:8089/api/getBookmarkParent",
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

            let oneHtml = '<div style="min-height: 70px;flex: 1;display: flex;flex-wrap:wrap;background: #0acf97">';
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
                initDesktopManager(`one${i}`); // 调用 initDesktopManager 函数
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
            const data = this.options.data;
            let timeout;
            const id = `one${i}`;
            this.$ele.on('touchstart', `.list${i}`, function (evt) {
                timeout = setTimeout(() => {
                    const dom = $(evt.currentTarget);
                    const id = dom.data("id");
                    const index = findIndexByid(id, data);
                    // openModal(dom, evt, store, data, index)
                }, 700);
            }).on('touchend', `.list${i}`, () => {
                clearTimeout(timeout);
            });

            this.$ele.on('click', `.list${i}`, function (evt) {
                evt.stopPropagation();
                const dom = $(evt.currentTarget);
                const id = dom.data("id");
                const url = dom.data("url");
                $.ajax({
                    url: `http://localhost:8089/api/getBookmarkChild?bookId=${id}`,
                    type: "get",
                    dataType: "json",
                    success: function (res) {
                        openPage(res, i);
                    }
                });
            });
        }
    }

    function openPage(res, i) {
        $('#one' + i).append(`<div class="page-bg">
                <div class="page-addbook">
                    <div class="addbook-content">
                        <div class="page bookmark twoParent" style="text-align: center;margin: 5%;overflow: auto;"></div>
                    </div>
                </div></div>`);

        dataBind(res, i);

        setTimeout(function () {
            $(".page-bg").addClass("animation");
            $(".addbook-content").addClass("animation");
        }, 50);

        $("#addbook-upload").click(function () {
            openFile(function () {
                const file = this.files[0];
                const reader = new FileReader();
                reader.onload = function () {
                    $("#addbook-upload").html(`<img src="${this.result}"><p>${file.name}</p>`);
                };
                $("#addbook-upload").css("pointer-events", "");
                $(".addbook-ok").css("pointer-events", "");
                reader.readAsDataURL(file);
            });
        });

        $(".addbook-ok").click(function () {
            let name = $(".addbook-name").val(),
                url = $(".addbook-url").val(),
                icon = $("#addbook-upload img").attr("src");
            if (name.length && url.length) {
                if (!icon) {
                    const canvas = document.createElement("canvas");
                    canvas.height = 100;
                    canvas.width = 100;
                    const ctx = canvas.getContext("2d");
                    ctx.fillStyle = "#f5f5f5";
                    ctx.fillRect(0, 0, 100, 100);
                    ctx.fill();
                    ctx.fillStyle = "#222";
                    ctx.font = "40px Arial";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(name.substr(0, 1), 50, 52);
                    icon = canvas.toDataURL("image/png");
                }
                bookMark.add(name, url, icon);
            }
        });

        $(".page-bg").click(function () {
            $(".page-addbook").css({"pointer-events": "none"});
            $(".page-bg").removeClass("animation");
            $(".addbook-content").removeClass("animation");
            setTimeout(function () {
                $(".page-addbook").remove();
                $(".page-bg").remove();
            }, 300);
        });

        $(".page-addbook").click(function (evt) {
            if (evt.target === evt.currentTarget) {
                $(".bottom-close").click();
            }
        });
    }

    function dataBind(res) {
        const bookMarkFn = function (ele, options) {
            this.$ele = $(ele);
            this.options = $.extend({}, res, options);
            this.init();
        };

        bookMarkFn.prototype = {
            init: function () {
                let html = '';
                const data = this.options.data;
                data.forEach(item => {
                    html += `<div class="twoChild" onclick="onClick(this)" name="${item.url}">
                               <div class="">
                                 <div class="text">${item.hl}</div>
                               </div>
                             </div>`;
                });
                this.$ele.html(html);
            },
            getJson: function () {
                return this.options.data;
            },
        };

        const bookMark = new bookMarkFn($('.page'), {data: store.get("page")});
    }

    function openFile(callback) {
        $('.openFile').remove();
        const input = $('<input class="openFile" type="file">');
        input.on("propertychange change", callback);
        $('body').append(input);
        input.click();
    }

    function findIndexByid(id, data) {
        return data.findIndex(item => item.id === id);
    }

    const bookMark = new bookMarkFn({data: store.get("page")});
});
