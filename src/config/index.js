require('dotenv').config();

module.exports = {
  amazon: {
    email: process.env.AMAZON_EMAIL,
    password: process.env.AMAZON_PASSWORD,
    baseUrl: 'https://sellercentral.amazon.com.br/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fsellercentral.amazon.com.br%2Fhome&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=sc_br_amazon_v2&openid.mode=checkid_setup&language=pt_BR&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&pageId=sc_br_amazon_v2&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&ssoResponse=eyJ6aXAiOiJERUYiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiQTI1NktXIn0.-J1nCo-RiajWT4TTVJo3BL8h9HIbj4QaWDMwAMTw_HN-btwREGh8dA.qcfL0yP1wxBgcp0E.CCAzkyLDOU2ujp0R5yZTYXWGNbM7cZgSZQThelOv4X-z6dZuqxoZ-VNlRfzFzdYumaD0AFQhTXiBAckDO9-KnJ4wAcVbesBFFyE4zKcTB6LsnAil_QgWVmx0Yi5ZD55NdG8h1eh2NVzNCJr9305H6ZYTlMe6Zit-gytY8NZBVrUMrWYA1nmGqCIi9VgAq9GjwKNBvD9QjzdV3UX5i7RFhGt1iQpuIymMJDMXzRwwcudCUDmi270GUMEcUgl2pZv_.jNMGoI3MFqCbA7duyZbV5g'
  },
  browser: {
    headless: false,
    slowMo: 50
  }
};
