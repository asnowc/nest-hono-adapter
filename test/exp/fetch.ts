const res = await fetch("http://127.0.0.1:3000/ip", { "X-Forwarded-For": "124.0.0.1" });
console.log(res.status, Object.fromEntries(res.headers));
const text = await res.text();
console.log(text);
