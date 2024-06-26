import { Client } from "@elastic/elasticsearch";

async function main() {
  const esClient = new Client({ node: "***" });
  try {
    const doc = await esClient.get({
      "index": '***',
      "id": '***'
    });
    const result = await esClient.delete({
      "index": '***',
      "id": '***'
    });
    console.log(result)
  } catch (e: any) {
    console.error(e.statusCode)
  }
}

main();