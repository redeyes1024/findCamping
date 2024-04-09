const fs = require("fs");

function processCampsitesData(filePath) {
  // Assuming you have the text data in 'data.txt' file
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading the file", err);
      return;
    }

    // Split the document into sections by "Processing new camp"
    const campSections = data.split("Processing new camp\n").slice(1); // remove the first element which is likely empty

    const campgrounds = campSections.map((section) => {
      const lines = section.split("\n").filter((line) => line); // split by newline and remove empty lines
      const url = lines[0]; // the first line after split is the URL
      const sites = [];
      const name = url
        .replace("https://www.campadk.com/campsitephotos/campgrounds/", "")
        .replace("/choosesite", "")
        .replace(/\+/g, " ");
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].startsWith("Site ")) {
          const siteInfo = {
            photoUrl: lines[i].split(" ")[1],
            reservationUrls: [],
          };
          i++;
          while (i < lines.length && lines[i].startsWith("https")) {
            siteInfo.reservationUrls.push(lines[i]);
            i++;
          }
          i--; // decrement to offset the outer loop's increment
          sites.push(siteInfo);
        }
      }

      return {
        url,
        name,
        sites,
      };
    });

    // Convert the campgrounds object to JSON
    const jsonOutput = JSON.stringify({ campgrounds }, null, 2);

    // Optionally, write the JSON to a file
    fs.writeFile("output.json", jsonOutput, "utf8", (err) => {
      if (err) {
        console.error("Error writing the JSON to file", err);
        return;
      }
      console.log("Successfully written the data to 'output.json'");
    });
  });
}

// Example usage
processCampsitesData("statusOutput.txt");
