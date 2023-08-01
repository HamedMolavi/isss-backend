var stdin = process.stdin;
export async function setupInteractive(): Promise<void> {
  // Setup Interactive stdin
  stdin.resume();
  stdin.setEncoding('utf8');
  stdin.on('data', function (key: string) {
    act(key.trim());
  });
};

async function act(action: string) {



  switch (action) { // explicit actions
    case '\u0003':// ctrl-c
      process.exit(0);
    case 'clear':
      console.clear();
      break;





    default: // implicit actions
      if (action.startsWith("close consumer")) {
        const consumerId = action.split("close consumer ")[1];
        process["ROOMS"].delete(consumerId);
      } else if (action.startsWith("close consumer")) {

      } else {
        console.log("Unknown command!");
        break;
      }
  };




};