# BMD-exchange-rate-updater
A simple app containerized in Docker container to update exchange rate for smart contracts


# How To Install and Config

1. Check out this project from github to any Linux (CentOS, Ubuntu) machines you would like to dedicate for this purpose.

2. Edit `env.file` with the proper values for the key that are permitted to update the contract exchange rate.

- `INFURA_API_KEY` - your Infura API key for MAINNET
- `BMD_PUBKEY` and `BMD_PRIVKEY` - The permitted key to the BMD-USD-ExchangeContract Contract
- `BMV_PUBKEY` and `BMV_PRIVKEY` - The permitted key to the BMV-USD-ExchangeContract Contract

e.g.
```
INFURA_API_KEY=your_own_infura_api_key
BMD_PUBKEY=0x123456789098765432134567890987654321
BMD_PRIVKEY=B09876543212343C0744098765432345678B0987656678987654567898765456
BMV_PUBKEY=0x123456789098765432134567890987654321
BMV_PRIVKEY=F234567898763456789876543245678998765434567890987654345678987654
NODE_ENV=production
```

3. Install the cronjob like the following if you are updating it once a day at ~9:30pm machine time.

```
# Install cron syntax like this
30 21 * * * /home/your_user_name/BMD-exchange-rate-updater/app/cron.sh
```

# Updating Contract Address

The `config` directory has 2 files, `default.json` and `production.json`, update `production.json` for production MAINNET contract address, and `default.json` for TESTNET.
