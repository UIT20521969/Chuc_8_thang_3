/*
 * Settings
 */
var settings = {
    particles: {
        length: 1900, // maximum amount of particles
        duration: 7, // particle duration in sec
        velocity: 15, // particle velocity in pixels/sec
        effect: 0.5000, // play with this for a nice effect
        size: 5, // particle size in pixels
    },
};

// Polyfill for requestAnimationFrame
(function () {
    var lastTime = 0;
    var vendors = ["ms", "moz", "webkit", "o"];
    for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
        window.requestAnimationFrame = window[vendors[i] + "RequestAnimationFrame"];
        window.cancelAnimationFrame = window[vendors[i] + "CancelAnimationFrame"] || 
                                      window[vendors[i] + "CancelRequestAnimationFrame"];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function (callback) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () {
                callback(currTime + timeToCall);
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
    }
})();

/*
 * Point class
 */
class Point {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    clone() {
        return new Point(this.x, this.y);
    }

    length(length) {
        if (length === undefined) 
            return Math.sqrt(this.x * this.x + this.y * this.y);
        this.normalize();
        this.x *= length;
        this.y *= length;
        return this;
    }

    normalize() {
        var len = this.length();
        this.x /= len;
        this.y /= len;
        return this;
    }
}

/*
 * Particle class
 */
class Particle {
    constructor() {
        this.position = new Point();
        this.velocity = new Point();
        this.acceleration = new Point();
        this.age = 0;
    }

    initialize(x, y, dx, dy) {
        this.position.x = x;
        this.position.y = y;
        this.velocity.x = dx;
        this.velocity.y = dy;
        this.acceleration.x = dx * settings.particles.effect;
        this.acceleration.y = dy * settings.particles.effect;
        this.age = 0;
    }

    update(deltaTime) {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;
        this.age += deltaTime;
    }

    draw(context, image) {
        function ease(t) {
            return (--t) * t * t + 1;
        }
        var size = image.width * ease(this.age / settings.particles.duration);
        context.globalAlpha = 1 - this.age / settings.particles.duration;
        context.drawImage(image, this.position.x - size / 2, this.position.y - size / 2, size, size);
    }
}

/*
 * ParticlePool class
 */
class ParticlePool {
    constructor(length) {
        this.particles = new Array(length);
        this.firstActive = 0;
        this.firstFree = 0;
        this.duration = settings.particles.duration;

        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i] = new Particle();
        }
    }

    add(x, y, dx, dy) {
        this.particles[this.firstFree].initialize(x, y, dx, dy);

        this.firstFree = (this.firstFree + 1) % this.particles.length;
        if (this.firstActive === this.firstFree) {
            this.firstActive = (this.firstActive + 1) % this.particles.length;
        }
    }

    update(deltaTime) {
        let i = this.firstActive;
        while (i !== this.firstFree) {
            this.particles[i].update(deltaTime);
            if (this.particles[i].age >= this.duration) {
                this.firstActive = (this.firstActive + 1) % this.particles.length;
            }
            i = (i + 1) % this.particles.length;
        }
    }

    draw(context, image) {
        let i = this.firstActive;
        while (i !== this.firstFree) {
            this.particles[i].draw(context, image);
            i = (i + 1) % this.particles.length;
        }
    }
}

/*
 * Animation Setup
 */
(function (canvas) {
    var context = canvas.getContext('2d'),
        particles = new ParticlePool(settings.particles.length),
        particleRate = settings.particles.length / settings.particles.duration, 
        time;

    function pointOnHeart(t) {
        return new Point(
            160 * Math.pow(Math.sin(t), 3),
            130 * Math.cos(t) - 50 * Math.cos(2 * t) - 20 * Math.cos(3 * t) - 10 * Math.cos(4 * t) + 25
        );
    }

    var image = (function () {
        var canvas = document.createElement('canvas'),
            context = canvas.getContext('2d');
        canvas.width = settings.particles.size;
        canvas.height = settings.particles.size;

        function to(t) {
            var point = pointOnHeart(t);
            point.x = settings.particles.size / 2 + point.x * settings.particles.size / 350;
            point.y = settings.particles.size / 2 - point.y * settings.particles.size / 350;
            return point;
        }

        context.beginPath();
        var t = -Math.PI;
        var point = to(t);
        context.moveTo(point.x, point.y);
        while (t < Math.PI) {
            t += 0.01;
            point = to(t);
            context.lineTo(point.x, point.y);
        }
        context.closePath();
        context.fillStyle = '#df3e87';
        context.fill();

        var image = new Image();
        image.src = canvas.toDataURL();
        return image;
    })();

    function render() {
        requestAnimationFrame(render);

        var newTime = new Date().getTime() / 1000,
            deltaTime = newTime - (time || newTime);
        time = newTime;

        context.clearRect(0, 0, canvas.width, canvas.height);

        var amount = particleRate * deltaTime;
        for (var i = 0; i < amount; i++) {
            var pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());
            var dir = pos.clone().length(settings.particles.velocity);
            particles.add(canvas.width / 2 + pos.x, canvas.height / 2 - pos.y, dir.x, -dir.y);
        }

        particles.update(deltaTime);
        particles.draw(context, image);
    }

    function onResize() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    window.onresize = onResize;

    setTimeout(function () {
        onResize();
        render();
    }, 10);
})(document.getElementById('pinkboard'));


function flipCard(card) {
    card.classList.toggle("flip");
}

function createHeart() {
    const heart = document.createElement("div");
    heart.innerHTML = "❤️";
    heart.classList.add("heart");

    // Vị trí ngẫu nhiên trong khoảng chiều rộng màn hình
    heart.style.left = Math.random() * window.innerWidth + "px";

    // Kích thước ngẫu nhiên
    heart.style.fontSize = Math.random() * 20 + 4 + "px";

    // Thêm trái tim vào trang
    document.body.appendChild(heart);

    // Xóa trái tim sau khi bay lên
    setTimeout(() => {
        heart.remove();
    }, 4000);
}

// Tạo trái tim liên tục mỗi 300ms
setInterval(createHeart, 300);

let isPlaying = false;
const music = document.getElementById("background-music");
const musicBtn = document.getElementById("music-btn");

// ✅ Kiểm tra nếu trình duyệt chặn tự động phát
function tryAutoPlay() {
    music.volume = 0.5; // Giảm âm lượng để không quá lớn

    let playPromise = music.play();

    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                isPlaying = true;
                musicBtn.innerHTML = "🔊 Pause"; // Đang phát
            })
            .catch(() => {
                console.log("Tự động phát bị chặn. Chờ người dùng tương tác.");
                document.addEventListener("click", enableMusicOnClick, { once: true });
            });
    }
}

// ✅ Phát nhạc khi người dùng nhấp lần đầu
function enableMusicOnClick() {
    music.play();
    isPlaying = true;
    musicBtn.innerHTML = "🔊 Pause"; // Đang phát
}

// ✅ Bật/Tắt nhạc khi nhấn nút
function toggleMusic() {
    if (isPlaying) {
        music.pause();
        musicBtn.innerHTML = "🎵 Play";
    } else {
        music.play();
        musicBtn.innerHTML = "🔊 Pause"; // Đang phát
    }
    isPlaying = !isPlaying;
}

// ✅ Chạy thử tự động phát khi trang tải
window.addEventListener("DOMContentLoaded", tryAutoPlay);
