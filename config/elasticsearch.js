import { Client } from '@elastic/elasticsearch'

const es = new Client({
    node: process.env.ELASTIC_SEARCH_URL,
    auth: {
        username: process.env.ES_USER,
        password: process.env.ELASTIC_PASSWORD
    }
})

export default es;