const axios = require("axios");
const fs = require("fs");
const replacements = [];
const replaceAllments = [];
var remoteContent;
async function init(content) {
    remoteContent = content;
    await inject();
    return batchReplace(remoteContent);
}
//#region 注入代码
async function inject() {
    await inject_jd();
}

async function inject_jd() {
    if (!process.env.JD_COOKIE) return;
    if (remoteContent.indexOf("function requireConfig()") >= 0 && remoteContent.indexOf("jd_bean_sign.js") >= 0) {
        replacements.push({
            key: "resultPath = err ? '/tmp/result.txt' : resultPath;",
            value: `resultPath = err ? './tmp/result.txt' : resultPath;`,
        });
        replacements.push({
            key: "JD_DailyBonusPath = err ? '/tmp/JD_DailyBonus.js' : JD_DailyBonusPath;",
            value: `JD_DailyBonusPath = err ? './tmp/JD_DailyBonus.js' : JD_DailyBonusPath;`,
        });
        replacements.push({
            key: "outPutUrl = err ? '/tmp/' : outPutUrl;",
            value: `outPutUrl = err ? './tmp/' : outPutUrl;`,
        });
    }
    special_handle();
    ignore_jd();
    await downloader_jd();
    await downloader_notify();
    await downloader_user_agents();
}

function special_handle() {
    // 特殊处理
    if (process.env.SYNCURL.indexOf('https://github.com/i-chenzhe/qx/raw/main/') > -1) {
        console.log("jd_entertainment.js 特殊处理");
        try {
            replacements.push({
                key: "helpAuthor = true",
                value: `helpAuthor = false`,
            });
            replacements.push({
                key: "await notify.sendNotify(`${$.name}运行完成",
                value: `// await notify.sendNotify(\`$\{$.name\}运行完成`,
            });
            console.log("jd_entertainment.js 特殊处理 生效");
        } catch (e) {
            console.log("jd_entertainment.js 特殊处理 有误");
        }
    }
    // 宠汪兑换特殊处理
    if (process.env.REPLACEALLMENTS_JOY_REWARD) {
        console.log("宠汪兑换 ../USER_AGENTS 特殊处理");
        try {
            replaceAllments.push({
                key: "../USER_AGENTS",
                value: `./USER_AGENTS`,
            });
            console.log("宠汪兑换 ../USER_AGENTS 特殊处理 生效");
        } catch (e) {
            console.log("宠汪兑换 ../USER_AGENTS 特殊处理 失败");
        }
    }
    // 宠汪赛跑助力特殊处理
    if (process.env.REPLACEMENTS_JOY_RUN) {
        console.log("宠汪汪赛跑 特殊处理");
        try {
            replacements.push({
                key: 'let invite_pins = [',
                value: `let invite_pins = ["zhongwangninja,jd_484831b48c6ab,wangpingdajie,jd_IottbtoaWkSE"];
// let invite_pins = [`,
            });
            replacements.push({
                key: 'let run_pins = [',
                value: `let run_pins = ["zhongwangninja,jd_484831b48c6ab,wangpingdajie,jd_IottbtoaWkSE"];
// let run_pins = [`,
            });
            replacements.push({
                key: 'let friendsArr = [',
                value: `let friendsArr = ["zhongwangninja", "jd_484831b48c6ab", "wangpingdajie", "jd_IottbtoaWkSE"];
// let friendsArr = [`,
            });
            console.log("宠汪汪赛跑 特殊处理 生效");
        } catch (e) {
            console.log("宠汪汪赛跑 特殊处理 失败");
        }
    }
}

function ignore_jd() {
    // 京喜农场禁用无效账号 Cookie，避免频繁通知
    if (process.env.JXNC_FORBID_ACCOUNT) {
        try {
            var ignore_indexs = process.env.JXNC_FORBID_ACCOUNT.split('&');
            var ignore_names = [];
            ignore_indexs.forEach((it) => {
                if (it == 0) {
                    ignore_names.push("CookieJD");
                    for (var i = 2; i < 10; i++) ignore_names.push("CookieJD" + i);
                } else if (it == 1) {
                    ignore_names.push("CookieJD");
                } else {
                    ignore_names.push("CookieJD" + it);
                }
            });
            replacements.push({
                key: "if (jdCookieNode[item]) {",
                value: `if (jdCookieNode[item] && ${JSON.stringify(ignore_names)}.indexOf(item) == -1) {`,
            });
            // whyour 屏蔽
            replacements.push({
                key: "if (!getCookies()) return;",
                value: `if (!getCookies()) return;
                    if (process.env.JXNC_FORBID_ACCOUNT == '0') return; if (process.env.JXNC_FORBID_ACCOUNT) { var accounts = process.env.JXNC_FORBID_ACCOUNT.split('&'); for (var i = accounts.length - 1; i > -1; i--) { $.cookieArr.splice(accounts[i] - 1, 1); } }
                    `
            });
            console.log(`JXNC_FORBID_ACCOUNT 已生效，将为您禁用${ignore_names}`);
        } catch (e) {
            console.log("JXNC_FORBID_ACCOUNT 填写有误,不禁用任何Cookie");
        }
    }
}

function batchReplace() {
    for (var i = 0; i < replacements.length; i++) {
        remoteContent = remoteContent.replace(replacements[i].key, replacements[i].value);
    }
    for (var i = 0; i < replaceAllments.length; i++) {
        remoteContent = replaceAll(remoteContent, replaceAllments[i].key, replaceAllments[i].value);
    }
    // console.log(remoteContent);
    return remoteContent;
}

function replaceAll(string, search, replace) {
    return string.split(search).join(replace);
}
//#endregion

//#region 文件下载

async function downloader_jd() {
    if (/require\(['"`]{1}.\/jdCookie.js['"`]{1}\)/.test(remoteContent))
        await download("https://github.com/lan-tianxiang/jd_scripts1/raw/master/jdCookie.js", "./jdCookie.js", "京东Cookies");
    if (remoteContent.indexOf("jdFruitShareCodes") > 0) {
        await download(
            "https://github.com/lan-tianxiang/jd_scripts1/raw/master/jdFruitShareCodes.js",
            "./jdFruitShareCodes.js",
            "东东农场互助码"
        );
    }
    if (remoteContent.indexOf("jdPetShareCodes") > 0) {
        await download(
            "https://github.com/lan-tianxiang/jd_scripts1/raw/master/jdPetShareCodes.js",
            "./jdPetShareCodes.js",
            "京东萌宠"
        );
    }
    if (remoteContent.indexOf("jdPlantBeanShareCodes") > 0) {
        await download(
            "https://github.com/lan-tianxiang/jd_scripts1/raw/master/jdPlantBeanShareCodes.js",
            "./jdPlantBeanShareCodes.js",
            "种豆得豆互助码"
        );
    }
    if (remoteContent.indexOf("jdSuperMarketShareCodes") > 0) {
        await download(
            "https://github.com/lan-tianxiang/jd_scripts1/raw/master/jdSuperMarketShareCodes.js",
            "./jdSuperMarketShareCodes.js",
            "京小超互助码"
        );
    }
    if (remoteContent.indexOf("jdFactoryShareCodes") > 0) {
        await download(
            "https://github.com/lan-tianxiang/jd_scripts1/raw/master/jdFactoryShareCodes.js",
            "./jdFactoryShareCodes.js",
            "东东工厂互助码"
        );
    }
    if (remoteContent.indexOf("jdDreamFactoryShareCodes") > 0) {
        await download(
            "https://github.com/lan-tianxiang/jd_scripts1/raw/master/jdDreamFactoryShareCodes.js",
            "./jdDreamFactoryShareCodes.js",
            "京喜工厂互助码"
        );
    }
    if (remoteContent.indexOf("new Env('京喜农场')") > 0) {
        await download(
            "https://github.com/lan-tianxiang/jd_scripts1/raw/master/jdJxncTokens.js",
            "./jdJxncTokens.js",
            "京喜农场Token"
        );
        await download(
            "https://github.com/lan-tianxiang/jd_scripts1/raw/master/jdJxncShareCodes.js",
            "./jdJxncShareCodes.js",
            "京喜农场分享码"
        );
    }
    if (remoteContent.indexOf('new Env("京喜财富岛') > 0) {
        await download(
            "https://github.com/lan-tianxiang/jd_scripts1/raw/master/jdJxncTokens.js",
            "./jdJxncTokens.js",
            "京喜农场Token"
        );
    }
}

async function downloader_notify() {
    await download("https://github.com/lan-tianxiang/jd_scripts1/raw/master/sendNotify.js", "./sendNotify.js", "统一通知");
}

async function downloader_user_agents() {
    await download("https://github.com/lan-tianxiang/jd_scripts1/raw/master/USER_AGENTS.js", "./USER_AGENTS.js", "云端UA");
}

async function download(url, path, target) {
    let response = await axios.get(url);
    let fcontent = response.data;
    fcontent = fcontent.replace(/JSON.stringify\(process.env\).indexOf\([\'|\"]GITHUB[\'|\"]\)/g, 'process&&JSON.stringify(process.env).indexOf(\'TEMP_GHAC\')');
    if (path == './jdCookie.js') fcontent = handle_jd_cookie(fcontent);
    await fs.writeFileSync(path, fcontent, "utf8");
    console.log(`下载${target}完毕`);
    if (fcontent.indexOf('./utils/jdShareCodes') > 0) await download_sharecode(fcontent);
}

function handle_jd_cookie(fcontent) {
    var key = 'for (let i = 0; i < CookieJDs.length; i++) {'
    var value = `var ignore_indexs = process.env.JD_COOKIE_FORBID ? process.env.JD_COOKIE_FORBID.split('&') : [];
if (ignore_indexs.length > 0) console.log(ignore_indexs[0] == '0' ? \`JD_COOKIE_FORBID 屏蔽所有账号\` : \`JD_COOKIE_FORBID 屏蔽账号 \${ignore_indexs}\`);
for (let i = 0; i < CookieJDs.length; i++) {`;
    fcontent = fcontent.replace(key, value);
    key = 'const index = (i + 1 === 1) ? \'\' : (i + 1);'
    value = `const index = (i + 1 === 1) ? '' : (i + 1);
  if (ignore_indexs.length > 0 && ignore_indexs[0] == '0') continue;
  if (ignore_indexs.indexOf((i + 1).toString()) > -1) { console.log(\`JD_COOKIE_FORBID 处理屏蔽账号 CookieJD\${index}\`); continue; }`
    fcontent = fcontent.replace(key, value);
    return fcontent;
}

async function download_sharecode(fcontent) {
    if (!fs.existsSync("utils")) fs.mkdirSync("utils");
    await download(
        "https://github.com/lan-tianxiang/jd_scripts1/raw/master/utils/jdShareCodes.js",
        "./utils/jdShareCodes.js",
        "循环助力码"
    );
}
//#endregion

module.exports = {
    inject: init,
};
