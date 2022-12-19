const ccxt = require("ccxt");
const mySql = require("mysql");
const HttpsProxyAgent = require ("https-proxy-agent");
const projectVar = require("./projectVar");

let exchange;

async function cryptoInvoiceBinance(coinName, curName, host)
{
    try
    {   
        let orderBook = await exchange.fetchOrderBook(coinName + '/' + curName, 1);

        let bidsFirst = orderBook["bids"][0][0];

        query(bidsFirst, true);

        let asksFirst = orderBook["asks"][0][0];

        query(asksFirst);

        function query(priceFirst, bid = false)
        {
            let now = Number(new Date());
            let bidNum = bid ? 1 : 0;
            connection.query(`UPDATE binance 
                                SET Rate = ${priceFirst}, Time = ${now}
                                WHERE (Coin = '${coinName}' AND Currency = '${curName}' AND Bid = ${bidNum});`, (err, result) => {
                if (err)
                {
                    console.log(`В БД не записанно. Ошибки: ${err} Результат: ${result}. ${coinName}/${curName}`);
                }
            });
        }
    }
    catch (err)
    {
        console.log(`Ошибка функции. ${err}. Host: ${host}, ${coinName}/${curName}`); 
        connection.query(`UPDATE binance 
                            SET Rate = null, Time = null 
                            WHERE (Coin = '${coinName}' AND Currency = '${curName}');`);
    }
}

async function run(agent)
{
    try
    {
        exchange = new ccxt.binance({agent});
        
        for (curName in projectVar.curCoin)
        {
            projectVar.curCoin[curName].forEach(coinName => {
                cryptoInvoiceBinance(coinName, curName, agent == undefined ? 'local' : agent.proxy.host);
            });
        }
    }
    catch (errCatch)
    {    
        console.log("Ошибка Обработчика: " + errCatch);
    }
}

const connection = mySql.createConnection({
    host : projectVar.mySqlDataConnection.host,
    user : projectVar.mySqlDataConnection.user,
    database : projectVar.mySqlDataConnection.database,
    password : projectVar.mySqlDataConnection.password
});

connection.connect(err => {
    if (err) 
    {
        console.log("Подключение к БД выполнено с ошибкой: " + err);
    }
    else
    {
        console.log("БД запущенна.");

        let agentArr = [];
            
        for (let index = 0; index < projectVar.proxyAddress.length; index++)
        {
            agentArr.push(new HttpsProxyAgent(projectVar.proxyAddress[index]));
        }

        const onTimeProxy = 60 / (agentArr.length + 1);

        setTimeout(() => {

            for (let index = 0; index < agentArr.length + 1; index++)
            {
                setTimeout(() => setInterval(run, 60000, agentArr[index]), onTimeProxy * index * 1000);
            }

        }, startTime());
    }
});

function startTime()
{
    const dateNow = new Date();
    return ((60 - dateNow.getSeconds()) * 1000);
}

//connection.end(err => sendTelegram("Ошибка закрытия БД: " + err));