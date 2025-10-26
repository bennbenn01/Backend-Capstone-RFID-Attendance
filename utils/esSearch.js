import es from "../config/elasticsearch.js"

export const esSearch = async (query = '', fields = ['driver_id', 'full_name']) => {
    if (!query) return [];

    const { hits } = await es.search({
        index: 'drivers',
        body: {
            query: {
                multi_match: {
                    query,
                    fields,
                    type: 'best_fields',
                    fuzziness: 'AUTO'
                }
            }
        }
    });

    return hits.hits.map(hit => hit._source);
}