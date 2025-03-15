import logger from "morgan";
import { randomUuid } from "../tools/utils.tools";

logger.token('id', function getId() { // log id
  return randomUuid();
});

export function setupLogger() {

  const middlewares = [
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    logger(":id :user-agent :remote-addr :date[web] :url :method :status"), // log all
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
  ];
  return middlewares;
}