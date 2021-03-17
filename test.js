function downXml(cid, name) {
    var now = new Date();
    var nowUnixTime = parseInt(Date.now() / 1000);
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var nowStrTime =
        now.getFullYear() +
        '-' +
        (month < 10 ? '0' + month : month) +
        '-' +
        (day < 10 ? '0' + day : day);
    var sign_str = '{cid}{strTime}1{name}{unixTime}293CB1A8B301DA66F555DCE029E53D9C'.format(
        { cid: cid, strTime: nowStrTime, name: name, unixTime: nowUnixTime }
    );
    var sign = md5(sign_str).toUpperCase();
    console.log('sign_str', sign_str);
    console.log('sign', sign);
    name = encodeURIComponent(name);
    name = name.replace('\\', '@ZSlash@');
    name = name.replace('/', '@FSlash@');
    name = name.replace('.', '@Point@');
    name = name.replace('&', '@And@');
    name = name.replace(':', '@YH@');
    name = name.replace('?', '@Quest@');
    name = name.replace('%2b', '@Jia@');
    name = name.replace('+', '@Blank@');
    var url = 'http://newbarrage.bilibilijj.com/api/down/{cid}/{strTime}/1/{name}/{sign}/{unixTime}'.format(
        {
            cid: cid,
            strTime: nowStrTime,
            name: name,
            unixTime: nowUnixTime,
            sign: sign,
        }
    );
    window.open(url);
}


http://newbarrage.bilibilijj.com/api/down/299563498/2021-03-17/1/2@Point@%E5%96%B5%E5%BD%B1-%E6%88%91%E7%9A%84%E5%BD%B1%E7%89%872/49E07B44526B7296B571B5028D24C08E/1615987227.448
http://newbarrage.bilibilijj.com/api/down/301937244/2021-03-17/1/2@Point@%E5%96%B5%E5%BD%B1-%E6%88%91%E7%9A%84%E5%BD%B1%E7%89%87222/BE6FCC5834B978A5757E2958FB6EB001/1615987052