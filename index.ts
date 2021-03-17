import fs from 'fs';
import axios from 'axios';
import zlib from 'zlib';
import { decodeDanmakuSegment, decodeDanmakuView } from './danmaku-converter/danmaku-segment';
import { promisify } from 'util';
import * as http from 'http';
import md5 from 'md5';

function wait<T>(promise: Promise<T>): T { return require('deasync2').await(promise); }

const regex = /(https?:\/\/www.bilibili.com\/video\/)?BV(\w{10})/;

const magicStr = 'fZodR9XQDSUm21yCkr6zBqiveYah8bt4xsWpHnJE7jL5VG3guMTKNPAwcF';
let table = {};
for (let i = 0; i < magicStr.length; i++) table[magicStr[i]] = BigInt(i);
let s = [11, 10, 3, 8, 4, 6, 2, 9, 5, 7];
const XOR = 177451812n,
    ADD = 100618342136696320n;

function encode(src) {
    src = (src ^ XOR) + ADD;
    let r = Array.from('BV          ');
    for (let i = 0; i < 10; i++) {
        r[s[i]] = magicStr[Number((src / 58n ** BigInt(i)) % 58n)];
    }
    return r.join('');
}

function decode(src) {
    let r = 0n;
    for (let i = 0; i < 10; i++) {
        r += table[src[s[i]]] * 58n ** BigInt(i);
    }
    return (r - ADD) ^ XOR;
}

async function getReply(oid: string) {
    return (
        await axios.get(
            'http://api.bilibili.com/x/v2/reply?type=1&oid=' +
                oid +
                '&sort=0&nohot=1'
        )
    ).data;
}

const inflate = promisify(zlib.inflate);


const ascendingSort = (itemProp) => {
  return (a, b) => itemProp(a) - itemProp(b)
}

async function getDanmaku(oid: string): Promise<string> {
    return (await axios.get(`https://comment.bilibili.com/${oid}.xml`)).data
}

async function getDanmaku2(oid: string): Promise<string[]> {

    async function fetchBlob(url: string): Promise<Buffer> {
        const response = await axios.get(url, {headers: {
            Cookie: "bfe_id=393becc67cde8e85697ff111d724b3c8; Path=/; Max-Age=600; Expires=Sun, 14-Mar-21 14:14:47 GMT",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:87.0) Gecko/20100101 Firefox/87.0",
            'bili-trace-id': '2f28432297604e17'
        }, responseType: 'arraybuffer'})
        return response.data;
    }

    const info = (
        await axios.get(
            'http://api.bilibili.com/x/web-interface/view?aid=' + oid
        )
    ).data;
    const list = [];

    for (const page of info.data.pages) {
        let cid = page.cid;
        let aid = oid;
        list.push(await downXml(cid, `${page.page + 1}.${page.part}`));
        /*
        const viewBlob = await fetchBlob(`https://api.bilibili.com/x/v2/dm/web/view?type=1&oid=${cid}&pid=${aid}`)
        if (!viewBlob) {
          throw new Error(`获取弹幕信息失败`)
        }
        console.log(`https://api.bilibili.com/x/v2/dm/web/view?type=1&oid=${cid}&pid=${aid}`);
        fs.writeFileSync('temp', viewBlob);
        const view = await decodeDanmakuView(viewBlob)
        
        const { total } = view.dmSge
        if (total === undefined) {
          throw new Error(`获取弹幕分页数失败: ${JSON.stringify(view)}`)
        }
        console.log('segment count =', total)
        const segments = await Promise.all(new Array(total).fill(0).map(async (_, index) => {
          const blob = await fetchBlob(`https://api.bilibili.com/x/v2/dm/web/seg.so?type=1&oid=${cid}&pid=${aid}&segment_index=${index + 1}`)
          if (!blob) {
            (new Error(`弹幕片段${index + 1}下载失败`))
            return []
          }
          console.log(`received blob for segment ${index + 1}`, blob)
          const result = await decodeDanmakuSegment(blob)
          return result.elems ?? []
        }))
        list.push( segments.flat().sort(ascendingSort((it: { progress: any; }) => it.progress)))*/
    }
    return list;
}

async function downXml(cid: string, name: string): Promise<string> {
    var now = new Date();
    var nowUnixTime = parseInt(`${Date.now() / 1000}`);
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var nowStrTime =
        now.getFullYear() +
        '-' +
        (month < 10 ? '0' + month : month) +
        '-' +
        (day < 10 ? '0' + day : day);
    var sign_str = `${cid}${nowStrTime}1${name}${nowUnixTime}293CB1A8B301DA66F555DCE029E53D9C`;
    var sign = md5(sign_str).toUpperCase();
    name = encodeURIComponent(name);
    name = name.replace('\\', '@ZSlash@');
    name = name.replace('/', '@FSlash@');
    name = name.replace('.', '@Point@');
    name = name.replace('&', '@And@');
    name = name.replace(':', '@YH@');
    name = name.replace('?', '@Quest@');
    name = name.replace('%2b', '@Jia@');
    name = name.replace('+', '@Blank@');
    const url = `http://newbarrage.bilibilijj.com/api/down/${cid}/${nowStrTime}/1/${name}/${sign}/${nowUnixTime}`
    return (await axios.get(url)).data;
}



(async () => {
    const links = fs.readFileSync('links.txt').toString().split('\r\n');
    for (const line of links) {
        const groups = regex.exec(line);
        if (groups === null || groups.length < 3) {
            continue;
        }
        const id = groups[2];
        const oid = decode('BV' + id).toString();
        
        try {
            // 弹幕
            const arr = await getDanmaku2(oid);
            for (const i in arr) {
                fs.writeFileSync(`BV${id}-${i}.xml`, arr[i]);
            }

            // 回复
            const reply = await getReply(oid);
            fs.writeFileSync(`BV${id}-reply.json`, JSON.stringify(reply, null, 4));

            console.log(`导出BV${id}成功`)
        } catch (err) {
            if (err.response?.status == '404') {
                console.error(oid + ' 404');
            }
        }
    }
})();
