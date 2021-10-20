require('dotenv').config();
import axios from 'axios';
import tsv from 'tsv';
import fs from 'fs';
import { stat } from 'fs/promises';
import {Address, BaseAddress, StakeCredential} from '@emurgo/cardano-serialization-lib-nodejs';
import { Client } from 'pg';

let { bech32, bech32m } = require('bech32')

// import CardanocliJs from 'cardanocli-js';
const CardanocliJs = require("cardanocli-js");

// let walletId = process.env.WALLET_ID;

// tips are appreciated: addr1qx6z8zp3q33r553dew9exu0px8e0c4vqjevtze8k8pp8j8qyk6mnpuy5rh546p46z5mku07jna4gtpp4epdpsvpy2u4qx6m7em
let shellyGenesisPath = './cli/configuration/cardano/mainnet-shelley-genesis.json';
let cliPath = './cli/cardano-cli';
let socketPath = '/Users/stephane/Library/Application Support/Daedalus Mainnet/cardano-node.socket';



// let stakeId = 'stake1uyuqtqq84v9jrqm0asptaehtw7srrr7cnwuxyqz38a6e8scm6lcf3';
let walletId = 'addr1q94dh797sthyw8vm0ntkaljwu3fnreastahewun3jp42trsyk6mnpuy5rh546p46z5mku07jna4gtpp4epdpsvpy2u4qc0rhwm';


const getStakeKey = (walletId) => {
    let address = Address.from_bech32(walletId);
    let cborHex = Buffer.from(address.to_bytes()).toString('hex').slice(-56);
    return Address.from_bytes(Buffer.from(`e1${cborHex}`, 'hex')).to_bech32();
}

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'cexplorer',
    password: 'v8hlDV0yMAHHlIurYupj',
    port: 6666
});

// let tsvPath = './avocado.tsv';
// let data = fs.readFileSync(tsvPath, 'utf8');
// let tsvData = tsv.parse(data);


// tsvData = tsvData.map(row => {
//     if (row.Address && row.Address.length > 0) row.Address = getStakeKey(row.Address);
//     return row;
// }).filter( r => r.Address && r.Address.length > 1);

// let output = tsv.stringify(tsvData);
// fs.writeFileSync('./avocado_holder_stats_output.tsv',output, 'utf-8');


// let utxo = cardanocliJs.queryUtxo('addr1q9fz7zuvvg0z3m24hent7rudgvzcvttyqn5ks6t83370u8gyk6mnpuy5rh546p46z5mku07jna4gtpp4epdpsvpy2u4quj5g8t');
// console.log(utxo);

let { BLOCKFROST_API_KEY } = process.env;
axios.defaults.timeout = 3e5;

const getPunkStatsByWalletId = walletId => {
    return new Promise((resolve, reject) => {
        axios.get(`https://pool.pm/wallet/${walletId}`)
        .then((res) => {
            let { tokens } = res.data;
            let punks = tokens.filter(v => v.policy === '57f93b225545f3b5db3ec36fab4967266f7b3f2799a1530ff78f1e29')

            let punkStats = punks.map(punk => {
                let lowestPerc = 100, highestPerc = 0;
                let totalRarity = 0;
                let { metadata, name } = punk;
                let percentageList = [];

                Object.keys(stats).forEach(cat => {
                    let c = metadata[cat];
                    if (c) {
                        let itemName = c.toLowerCase();
                        if (cat == 'accessories') {
                            Object.keys(stats[cat]).forEach(accessory => {
                                if (itemName.indexOf(accessory) != -1) {
                                    let perc = stats[cat][accessory];
                                    let rarity = 1 / (perc / 100);
                                    lowestPerc = lowestPerc > perc ? perc : lowestPerc;
                                    highestPerc = highestPerc < perc ? perc : highestPerc;

                                    totalRarity += rarity;
                                    percentageList.push(perc);
                                }
                            })
                        } else {
                            let perc = stats[cat][itemName];
                            let rarity = 1 / (perc / 100);
                            lowestPerc = lowestPerc > perc ? perc : lowestPerc;
                            highestPerc = highestPerc < perc ? perc : highestPerc;
                            totalRarity += rarity;
                            percentageList.push(perc);
                        }
                    }
                })

                let attributeCount = percentageList.length;
                let avgRating = percentageList.reduce((a, b) => a + b) / percentageList.length;

                return { name, rarityScore: totalRarity, avgRate: avgRating, lowestRate: lowestPerc, highestRate: highestPerc, attributes: attributeCount };
            });

            resolve(punkStats)
        })
        .catch(e => reject(e));
    })

}

const getAssetStats = assetName => {
    return new Promise((resolve, reject) => {
        let assetUrl = `https://pool.pm/asset/57f93b225545f3b5db3ec36fab4967266f7b3f2799a1530ff78f1e29.${assetName}`;
        axios.get(assetUrl).then(res => {
            if (res.status == 200) {
                let { metadata, name } = res.data;
                let lowestPerc = 100, highestPerc = 0;
                let totalRarity = 0;
                // let { metadata, name } = punk;
                let percentageList = [];
                let missingAttributes = [];

                Object.keys(stats).forEach(cat => {
                    let c = metadata[cat];
                    if (c) {
                        let itemName = c.toLowerCase();
                        if (cat == 'accessories') {
                            Object.keys(stats[cat]).forEach(accessory => {
                                if (itemName.indexOf(accessory) != -1) {
                                    let perc = stats[cat][accessory];
                                    let rarity = 1 / (perc / 100);
                                    lowestPerc = lowestPerc > perc ? perc : lowestPerc;
                                    highestPerc = highestPerc < perc ? perc : highestPerc;

                                    totalRarity += rarity;
                                    percentageList.push(perc);
                                }
                            })
                        } else {
                            let perc = stats[cat][itemName];
                            let rarity = 1 / (perc / 100);
                            lowestPerc = lowestPerc > perc ? perc : lowestPerc;
                            highestPerc = highestPerc < perc ? perc : highestPerc;
                            totalRarity += rarity;
                            percentageList.push(perc);
                        }
                    } else {
                        missingAttributes.push(cat);
                    }
                })

                let attributeCount = percentageList.length;
                let avgRating = Number((percentageList.reduce((a, b) => a + b) / percentageList.length).toFixed(2));
                lowestPerc = Number(lowestPerc.toFixed(2));
                highestPerc = Number(highestPerc.toFixed(2));
                totalRarity = Number(totalRarity.toFixed(2));

                resolve({ name, rarityScore: totalRarity, avgRate: avgRating, lowestRate: lowestPerc, highestRate: highestPerc, attributes: attributeCount, missing: missingAttributes.join(', ') });
            }
            
        }).catch(e => reject(e));
    });
}

// getAssetStats('ADAPunks4172').then( result => {
//     console.log(result);
// })

// getPunkStatsByWalletId('addr1q8nhu96nt685g0mmvfh4q2r33a05dyvp2j4n69qjzej54j6ku5r7246hu5pyqmpkherpy9zcq9erh4444n6rnl8fh63sg40te7').then(result => {
//     console.log(result);
// })

const getAssetDetailsByPolicyId = policyId => {
    return new Promise((resolve, reject) => {
        axios.get(`https://cardano-mainnet.blockfrost.io/api/v0/assets/policy/${policyId}`, { headers: { 'project_id':  BLOCKFROST_API_KEY}})
        .then( async res => {
            let metadata = null;
            for(let i = 0; i < res.data.length; i++) {
                let { asset } = res.data[i];
                let { data } = await axios.get(`https://cardano-mainnet.blockfrost.io/api/v0/assets/${asset}`, { headers: { 'project_id':  BLOCKFROST_API_KEY}});
                metadata = data['onchain_metadata'];

                if(metadata) {
                    let { name } = metadata;
                    name = name.replace(/ /gmi, '');
                    delete metadata.name;
                    delete metadata.image;
                    delete metadata.files;
                    delete metadata.website;
                    delete metadata.mediaType;

                    let params = Object.keys(metadata);

                    let n = name.match(/\d+/g)[0]
                    let namespace = name.replace(n, '');

                    metadata = { namespace, params };
                }
                
                if(metadata) break;
            }
            resolve(metadata);
        })
        .catch(reject);
    });
}


// let policyId = '57f93b225545f3b5db3ec36fab4967266f7b3f2799a1530ff78f1e29';
// let gnomiesPolicyId = 'b5fe4b252a54d6c39689c740e9f5b18355b9b983da2295cee6906420';
// getAssetDetailsByPolicyId(gnomiesPolicyId).then( async data => {

// });

const getStats = data => {
    let stats = {};
    let dupEnum = {};

    data = data.filter( d => d && !d.status);
    let params = data.slice(0,1)[0];
    delete params.name;
    params = Object.keys(params.attributes);
    data = data.map(d => d.attributes);
    params.forEach(p => {
        stats[p] = { total: 0 };
        data.forEach(d => {
            let stat = d[p].toLowerCase();
            if(!stat || stat == '') stat = 'none';
            if(typeof stats[p][stat] == 'undefined') stats[p][stat] = 0;

            if(!dupEnum[stat]) dupEnum[stat] = {};
            if(!dupEnum[stat][p]) dupEnum[stat][p] = 0;
            dupEnum[stat][p]++;
            
            stats[p][stat]++;
            stats[p]['total']++;
        })
    })

    return stats;
};

const getAsset = (policyId, assetName) => {
    return new Promise((resolve, reject) => {
        axios.get(`https://pool.pm/asset/${policyId}.${assetName}`)
        .then(res => {
            // let pass = res.status == 200 && res.data && res.data.metadata ? true : false;
            if(res.status === 200 && res.data && res.data.metadata) {
                let { metadata, owner } = res.data;
                delete metadata.image;
                delete metadata.files;
                delete metadata.website;
                delete metadata.mediaType;
                metadata.owner = owner;
                resolve(metadata)
            } else {
                console.log(`${assetName} not found`);
                resolve(null);
            }
        })
        .catch(e => {
            resolve({name: assetName, status: 'not found'});
        });
    });
};


const getAssetsByPolicyId = async (policyId) => {
    return new Promise(async (resolve, reject) => {
        const apiLimit = 100;
        const increment = 20;

        let capReached = false;
        let page = 1;
        let metadata = [], results = [];

        while(!capReached) {
            let assetQueue = [];
            for(let i = page; i < page+increment; i++) {
                let req =  axios.get(`https://cardano-mainnet.blockfrost.io/api/v0/assets/policy/${policyId}?page=${i}`, { headers: { 'project_id': BLOCKFROST_API_KEY } });
                assetQueue.push(req);
            }

            let assetList = await Promise.all(assetQueue);
            assetList = assetList.map(a => a.data).filter(a => a && a.length > 0);

            if(assetList.length == 0) capReached = true;
            page += increment;
            for(let i = 0; i < assetList.length; i++) {
                metadata = [...metadata, ...assetList[i]]
            }
        }

        console.log(`total assets found: ${metadata.length}`);

        let n = metadata.length;
        while(metadata.length > 0) {
            let process = (((n-metadata.length) / n) * 100).toFixed(2);
            let assetRequests = metadata.splice(0,50).map(a => axios.get(`https://cardano-mainnet.blockfrost.io/api/v0/assets/${a.asset}`, { headers: { 'project_id':  BLOCKFROST_API_KEY}}));
            let assets = await Promise.all(assetRequests);
            assets = assets.map( asset => asset.data);
            results = [...results, ...assets];

            console.log(`${process}%, assets remaining: ${metadata.length}`);
        }

        while(metadata.length > 0) {

        }
        resolve(results);
    });
}

const getBlockchainStats = async () => {
    let result = {};
    let behindQuery = `select now () - max (time) as behind_by from block ; `
    let syncQuery = `
        select
        100 * (extract (epoch from (max (time) at time zone 'UTC')) - extract (epoch from (min (time) at time zone 'UTC')))
        / (extract (epoch from (now () at time zone 'UTC')) - extract (epoch from (min (time) at time zone 'UTC')))
        as sync_percent
        from block ;
    `;

    let a = await client.query(behindQuery);
    let b = await client.query(syncQuery);

    let {behind_by} = a.rows[0];
    let {sync_percent} = b.rows[0];
    result = {behind_by, sync_percent};

    console.log(result);
}

const getAllMintScripts = async () => {
    let query = `select redeemer.tx_id as tx_id, redeemer.unit_mem, redeemer.unit_steps, redeemer.fee as redeemer_fee, redeemer.purpose, ma_tx_mint.policy, ma_tx_mint.name, ma_tx_mint.quantity
    from redeemer join ma_tx_mint on redeemer.script_hash = ma_tx_mint.policy
    and redeemer.tx_id = ma_tx_mint.tx_id
      where purpose = 'mint';`;
    
    let a = await client.query(query);
    console.log(a);
}

(async => {
    // client.connect();

    let syncQuery = `
        select
        100 * (extract (epoch from (max (time) at time zone 'UTC')) - extract (epoch from (min (time) at time zone 'UTC')))
        / (extract (epoch from (now () at time zone 'UTC')) - extract (epoch from (min (time) at time zone 'UTC')))
        as sync_percent
        from block ;
    `;

    let behindQuery = `select now () - max (time) as behind_by from block ; `
    // client.query(behindQuery, (err, res) => {
    //     console.log(res.rows);
    // })

    // let [err, res] = await client.query(behindQuery);
    // getBlockchainStats();
    // getAllMintScripts();
    // let policyId = '57f93b225545f3b5db3ec36fab4967266f7b3f2799a1530ff78f1e29';
    // let policyId = {
    //     avocado: 'a9fec012668b7ea6a829ba4595191cb29af6e885e42a3a8f2aae36b3',
    //     spaceTokens: '5ade68ae73cd2a67c8de59238164487da03119f9a5c9f3abd990c251'
    // }

    // getAssetsByPolicyId(policyId.spaceTokens).then(data => {
    //     let timestamp = new Date().getTime();
    //     fs.writeFileSync(`./${policyId.spaceTokens}-${timestamp}.json`, JSON.stringify(data, 0, 4), 'utf-8');
    // });


    // axios.get(`https://cardano-mainnet.blockfrost.io/api/v0/assets/policy/${policyId}`, { headers: { 'project_id':  BLOCKFROST_API_KEY}}).then( data => {
    //     console.log(data);
    // })
    // let policyId = 'a9fec012668b7ea6a829ba4595191cb29af6e885e42a3a8f2aae36b3';
    // let increment = 100;
    // let max = 6700;
    // getAssetDetailsByPolicyId(policyId).then( async details => {
        
    //     let limit =  (max+increment) / increment;
    //     let results = [];
    //     for(let i = 1; i < limit; i++) {
    //         let start = increment*(i-1);
    //         let end = increment * i;
    //         let data = await getAssetInRange(policyId, details.namespace, start, end);
    //         results = [...results, ...data];

    //         console.log(start, end);
    //     }


    //     let assetData = JSON.stringify(results, 0, 4);
    //     let filePath = `./${details.namespace}Data.json`;
    //     fs.writeFileSync(filePath, assetData, 'utf8');
    // });

    let data = JSON.parse(fs.readFileSync('./data/5ade68ae73cd2a67c8de59238164487da03119f9a5c9f3abd990c251-1634691636628.json'));
    let increment = 100;
    let max = data.length;

    // let stats = getStats(data);
    // fs.writeFileSync('5ade68ae73cd2a67c8de59238164487da03119f9a5c9f3abd990c251-1634691636628_stats.json', JSON.stringify(stats, 0, 4), 'utf-8');
    // let walletRef = {};
    // let highest = 0;
    // let rarest = 0;
    // data.forEach(d => {
    //     let { name, owner, attributes } = d;

    //     if(!walletRef[owner]) walletRef[owner] = { count: 0, scoreTotal: 0};

    //     if(owner && attributes) {
    //         let traitCount = Object.keys(attributes);
    //         let spl = 0;
    //         Object.keys(stats).forEach(k => {
    //             let {total} = stats[k];
    //             let a = attributes[k].toLowerCase();
    //             let v = stats[k][a];
    //             let prc = Number((v/ total).toFixed(2));
    //             spl += 1/prc;
    //         });

    //         walletRef[owner].count++;
    //         walletRef[owner].scoreTotal = Number(spl.toFixed(4));
    //     }
    // })

    // let statResults = Object.keys(walletRef).map(id => {
    //     let {count, scoreTotal} = walletRef[id];
    //     let hybridScore = Number((count / scoreTotal).toFixed(4));
    //     return {id, count, scoreTotal, hybridScore};
    // }).sort( (a, b) => b.hybridScore - a.hybridScore);

    // statResults.forEach((v, i) => {
    //     statResults[i].rank = i+1;
    // })

    // fs.writeFileSync('./avocado_holder_stats.json',JSON.stringify(statResults, 0, 4), 'utf-8');
    
})();


//https://pool.pm/asset/57f93b225545f3b5db3ec36fab4967266f7b3f2799a1530ff78f1e29.ADAPunks964
  

// https://cardano-mainnet.blockfrost.io/api/v0/assets/{asset}


//https://cardano-mainnet.blockfrost.io/api/v0/assets/policy/{policy_id}

//https://cardano-mainnet.blockfrost.io/api/v0/assets/policy/57f93b225545f3b5db3ec36fab4967266f7b3f2799a1530ff78f1e29