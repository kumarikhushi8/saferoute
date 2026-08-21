const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/route', {
      origin: '-73.985,40.758',
      destination: '-73.935,40.730'
    });
    console.log("Safest Summary:", res.data.safest.summary);
    console.log("Fastest Summary:", res.data.fastest.summary);
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
