#! /usr/bin/env node
/*jshint esversion: 6*/

const assert = require("assert");
const https = require("https");
const crypto = require("crypto");
const { ethers } = require("ethers");
const config = require("config");

const decimals = 18;
// endpoint must end with `/`
const baseUrlInfura = config.get("infura.gateway_url");
const infuraUrl = baseUrlInfura + process.env.INFURA_API_KEY;
const bmdAddress = config.get("ethereum.BMD.contract.address");
const bmvAddress = config.get("ethereum.BMV.contract.address");
const provider = new ethers.JsonRpcProvider(infuraUrl);
const exchangeRateInterface = new ethers.Interface(["function setExchangeRate(uint256 newExRate)"]);

const { createLogger, format, transports } = require("winston");
const { combine, timestamp } = format;
const DailyRotateFile = require("winston-daily-rotate-file");

let logger;
function getLogger() {
  if (!logger) {
    const appTransport = new transports.DailyRotateFile({
      filename: "logs/app-%DATE%.log",
      datePattern: "YYYY-MM-DD-HH",
      zippedArchive: false,
      maxSize: "20m",
      maxFiles: "180d"
    });
    logger = createLogger({
      level: "debug",
      format: combine(format.label({ uid: crypto.randomUUID() }), timestamp(), format.json()),
      transports: [new transports.Console(), appTransport]
    });
  }
  return logger;
}

function getEthUsdRate() {
  return new Promise((resolve, reject) => {
    https
      .get("https://api.coinbase.com/v2/exchange-rates?currency=ETH", response => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", chunk => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`Coinbase rates request failed with HTTP ${response.statusCode}`));
            return;
          }

          try {
            const payload = JSON.parse(body);
            const rate = payload && payload.data && payload.data.rates && payload.data.rates.USD;
            if (!rate) {
              reject(new Error("Coinbase rates response did not include ETH/USD"));
              return;
            }
            resolve(rate);
          } catch (parseError) {
            reject(parseError);
          }
        });
      })
      .on("error", reject);
  });
}

function normalizePrivateKey(privateKey) {
  if (!privateKey) {
    throw new Error("Missing private key environment variable");
  }
  return privateKey.startsWith("0x") ? privateKey : "0x" + privateKey;
}

async function updateExchangeRate(name, contractAddress, publicKey, privateKey, usdRate) {
  const wallet = new ethers.Wallet(normalizePrivateKey(privateKey), provider);
  if (publicKey && wallet.address.toLowerCase() !== publicKey.toLowerCase()) {
    throw new Error(`${name} public key does not match private key`);
  }

  const exchangeRate = ethers.parseUnits(usdRate, decimals);
  const data = exchangeRateInterface.encodeFunctionData("setExchangeRate", [exchangeRate]);
  const functionSelector = data.slice(2, 10);
  getLogger().info("contract function encoded: " + functionSelector);
  assert.equal(functionSelector, "db068e0e", "contract function ABI has changed, please verify and update");
  getLogger().info(`${name} new exchange rate in wei-scaled units: ${exchangeRate.toString()}`);

  const tx = await wallet.sendTransaction({
    to: contractAddress,
    data: data,
    value: 0,
    gasLimit: 30000,
    gasPrice: ethers.parseUnits("12", "gwei")
  });
  getLogger().info(`${name} exchange rate transaction sent: ${tx.hash}`);
  return tx.hash;
}

async function main() {
  getLogger().info(
    `Contract updater started on [${
      process.env.NODE_ENV
    }] environment. BMD contract address:[${bmdAddress}] BMV contract address:[${bmvAddress}] with Infura URL:[${baseUrlInfura}***]`
  );

  const usdRate = await getEthUsdRate();
  getLogger().info(`ETH/USD rate from Coinbase: ${usdRate}`);

  await Promise.all([
    updateExchangeRate("BMD", bmdAddress, process.env.BMD_PUBKEY, process.env.BMD_PRIVKEY, usdRate),
    updateExchangeRate("BMV", bmvAddress, process.env.BMV_PUBKEY, process.env.BMV_PRIVKEY, usdRate)
  ]);
}

if (require.main === module) {
  main().catch(err => {
    getLogger().error(err);
    process.exitCode = 1;
  });
}

module.exports = {
  getEthUsdRate,
  normalizePrivateKey,
  updateExchangeRate,
  main
};
