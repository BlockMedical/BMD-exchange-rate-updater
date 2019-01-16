#! /usr/bin/env node
/*jshint esversion: 6*/

const assert = require("assert");
const CONTRACT_ABI = require("./lib_contract");
// run with local Provider
var Web3 = require("web3");
const EthereumTx = require("ethereumjs-tx");
const ABI_coder = require("ethereumjs-abi");
const BigNumber = require("bignumber.js");
const decimals = 18;
const uuidv1 = require("uuid/v1");
const config = require("config");
// enpoint_IPFS must end with `/`
const baseUrl_infura = config.get("infura.gateway_url");

const bmd_address = config.get("ethereum.BMD.contract.address");
const bmv_address = config.get("ethereum.BMV.contract.address");
// old web3 versions 0.20.x
// web3.eth.contract(contractAbi).at(contractAddress);
// new web3 versions 1.0.x
// web3.eth.Contract(contractAbi, contractAddress);
const bmd_web3 = new Web3(new Web3.providers.HttpProvider(baseUrl_infura + process.env.INFURA_API_KEY));
const bmv_web3 = new Web3(new Web3.providers.HttpProvider(baseUrl_infura + process.env.INFURA_API_KEY));
let bmd_contract_instance = null;
let bmv_contract_instance = null;
if (process.env.NODE_ENV === "development") {
  console.log("Configuring " + process.env.NODE_ENV + " env");
  bmd_contract_instance = new bmd_web3.eth.contract(CONTRACT_ABI.DEFAULT_BMD_TRADE_CONTRACT_ABI).at(bmd_address);
  bmv_contract_instance = new bmv_web3.eth.contract(CONTRACT_ABI.DEFAULT_BMV_TRADE_CONTRACT_ABI).at(bmv_address);
} else {
  console.log("Configuring " + process.env.NODE_ENV + " env");
  bmd_contract_instance = new bmd_web3.eth.contract(CONTRACT_ABI.PROD_BMD_TRADE_CONTRACT_ABI).at(bmd_address);
  bmv_contract_instance = new bmv_web3.eth.contract(CONTRACT_ABI.PROD_BMV_TRADE_CONTRACT_ABI).at(bmv_address);
}
/* jshint ignore:start */
const eth_to_wei = new BigNumber(10 ** decimals);
/* jshint ignore:end */

const { createLogger, format, transports } = require("winston");
const { combine, timestamp, label, printf } = format;
const DailyRotateFile = require("winston-daily-rotate-file");
var appTransport = new transports.DailyRotateFile({
  filename: "logs/app-%DATE%.log",
  datePattern: "YYYY-MM-DD-HH",
  zippedArchive: false,
  maxSize: "20m",
  maxFiles: "180d"
});
const logger = createLogger({
  level: "debug",
  format: combine(format.label({ uid: uuidv1() }), timestamp(), format.json()),
  transports: [new transports.Console(), appTransport]
});

function rawTransaction(_w3, senderPublicKey, senderPrivateKey, contractAddress, data, value) {
  return new Promise((resolve, reject) => {
    let key = Buffer.from(senderPrivateKey, "hex");
    // required to keep track of tx#
    let nonce = _w3.toHex(_w3.eth.getTransactionCount(senderPublicKey));
    let gasLimitHex = _w3.toHex(30000);
    let gasPriceHex = _w3.toHex(12000000000); // 41000000000 = 41 gwei, 12000000000 = 12 gwei
    logger.info("nonce=" + _w3.toDecimal(nonce));
    const rawTx = {
      nonce: nonce,
      gasPrice: gasPriceHex,
      gasLimit: gasLimitHex,
      data: data,
      to: contractAddress,
      value: _w3.toHex(value)
    };
    console.log("tx data includes: " + data);
    let tx = new EthereumTx(rawTx);
    tx.sign(key);

    let stx = "0x" + tx.serialize().toString("hex");

    _w3.eth.sendRawTransaction(stx, (err, hash) => {
      if (err) {
        reject(err);
      } else {
        resolve(hash);
      }
    });
  });
} // end function

logger.info(
  `Contract updater started on [${
    process.env.NODE_ENV
  }] environment. BMD contract address:[${bmd_address}] BMV contract address:[${bmv_address}] with Infura URL:[${baseUrl_infura}][${
    process.env.INFURA_API_KEY
  }]`
);

let Client = require("coinbase").Client;
let client = new Client({ apiKey: "API KEY", apiSecret: "API SECRET" });

client.getExchangeRates({ currency: "ETH" }, function(err, rates) {
  if (err) {
    logger.error(err);
    return err;
  } else {
    logger.info(rates.data.rates.USD);
    let value = new BigNumber(0).multipliedBy(eth_to_wei); // 1 eth = 1 * 10 ** 18 wei.
    let new_exrate = new BigNumber(rates.data.rates.USD).multipliedBy(eth_to_wei).toString(16);
    let padd_new_exrate = new_exrate.padStart(64, "0");
    let func_abi = ABI_coder.methodID("setExchangeRate", ["uint256"]).toString("hex");
    logger.info("contract function encoded: " + func_abi);
    assert.equal(func_abi, "db068e0e", "contract function ABI has changed, please verify and update");
    logger.info("new exchange rate in hex shows " + padd_new_exrate);
    // buggy APIs these days. the following in web3 has issue to address bignumbers. therefore,
    // we manually craft the ABI and encoding.... sigh
    // bmd_contract_instance.setExchangeRate().getData([new_exrate]);
    // e.g. 0xdb068e0e000000000000000000000000000000000000000000000006c6b935b8bbd40000
    let dd = "0x" + func_abi + padd_new_exrate;
    let notOwner = process.env.PUBKEY;
    let notOwnerPrivateKey = process.env.PRIVKEY;
    try {
      let result = rawTransaction(bmd_web3, notOwner, notOwnerPrivateKey, bmd_address, dd, 0);
    } catch (tx_err) {
      console.log(tx_err);
    }
  }
});
