function reverseString(str: string) {
  // Step 1. Use the split() method to return a new array
  var splitString = str.split("/"); // var splitString = "hello".split("");
  //sort time to date/month/year
  let newArray: string[] = [splitString[1], splitString[0], splitString[2]];
  let resultArray: string[] = [];
  //check for 2 digit or not add 0 before
  const re = new RegExp("[10-32]");
  let s: string = "";
  for (let i = 0; i < newArray.length - 1; i++) {
    if (!re.test(newArray[i])) {
      s = "0" + newArray[i];
      resultArray.push(s);
    }else{
      resultArray.push(newArray[i]);
    }
    
  }
  //add year to the end of the array
  resultArray.push(newArray[newArray.length - 1]);
  // Step 2. Use the reverse() method to reverse the new created array
  var reverseArray = resultArray.reverse(); // var reverseArray = ["h", "e", "l", "l", "o"].reverse();
  // ["o", "l", "l", "e", "h"]
  // Step 3. Use the join() method to join all elements of the array into a string
  var joinArray = reverseArray.join("-"); // var joinArray = ["o", "l", "l", "e", "h"].join("");
  // "olleh"
  //Step 4. Return the reversed string
  return joinArray; // "olleh"
}

export default reverseString;
