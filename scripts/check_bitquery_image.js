const fetch = require('node-fetch');

const BITQUERY_API = 'https://streaming.bitquery.io/graphql';
const BITQUERY_TOKEN = 'ory_at_56LmEsNqnOWS7V7XSI-ymUTyQ_QSPNN566fpceyhNic.VleMEoz6t5TUhlQk2thrl9gAgOTpZGNbBzAIcHmO92A';
const ADDRESS = '5fA3Gepc3Xqzd1GBddXigUEjY5LSb4k6HkZb3jeHtwvh';

async function check() {
    const query = `
    query {
      Solana {
        DEXTradeByTokens(
          limit: {count: 1}
          where: {
            Trade: {
              Currency: {
                MintAddress: {is: "${ADDRESS}"}
              }
            }
          }
        ) {
          Trade {
            Currency {
              Symbol
              Name
              MintAddress
              Uri
            }
          }
        }
      }
    }
  `;

    try {
        const response = await fetch(BITQUERY_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BITQUERY_TOKEN}`
            },
            body: JSON.stringify({ query })
        });
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

check();
