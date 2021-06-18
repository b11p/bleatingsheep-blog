(function () {
    let images1 = document.querySelectorAll("div > img");
    for (let i = 0; i < images1.length; i++) {
        let current = images1[i];
        if (current.parentElement.hasAttribute("img-scale")) {
            current.onload = function () {
                let width = current.naturalWidth / current.parentElement.getAttribute("img-scale");
                current.setAttribute("width", width);
            }
            let width = current.naturalWidth / current.parentElement.getAttribute("img-scale");
            if (width == 0)
                continue;
            current.setAttribute("width", width);
        }
    }

    let images2 = document.querySelectorAll(".post-content img");
    for (let i = 0; i < images2.length; i++) {
        let current = images2[i];
        console.log(current.src);
        try {
            let path = decodeURIComponent(new URL(current.src).pathname);
            let match = /-((?=\d|\.\d)\d*\.?\d*)x\.[a-z]+$/i.exec(path);
            if (match == null) {
                continue;
            }
            let scale = match[1];
            current.onload = function () {
                let width = current.naturalWidth / scale;
                current.setAttribute("width", width);
            }
            let width = current.naturalWidth / scale;
            if (width == 0)
                continue;
            current.setAttribute("width", width);
        } catch (error) {
        }
    }
})()