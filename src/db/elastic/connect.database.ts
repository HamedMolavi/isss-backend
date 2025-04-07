import { Client } from '@elastic/elasticsearch';



export async function connectToElastic(connectionString: string) {
  const esClient = new Client({ node: connectionString });
  console.log(esClient.connectionPool)
  return esClient
}
