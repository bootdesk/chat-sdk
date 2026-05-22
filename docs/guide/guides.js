(function() {
  var prefersDark = matchMedia("(prefers-color-scheme:dark)").matches;
  var stored = localStorage.getItem("theme");
  if (stored === "dark" || (!stored && prefersDark)) {
    document.documentElement.classList.add("dark");
  }
})();

hljs.highlightAll();

document.getElementById("theme-toggle").addEventListener("click", function() {
  var html = document.documentElement;
  html.classList.toggle("dark");
  localStorage.setItem("theme", html.classList.contains("dark") ? "dark" : "light");
});

document.getElementById("menu-toggle").addEventListener("click", function() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebar-overlay").classList.toggle("show");
});

document.getElementById("sidebar-overlay").addEventListener("click", function() {
  document.getElementById("sidebar").classList.remove("open");
  this.classList.remove("show");
});

document.getElementById("sidebar").addEventListener("click", function(e) {
  if (e.target.tagName === "A" && window.innerWidth < 768) {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebar-overlay").classList.remove("show");
  }
});
