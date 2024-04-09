const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs").promises;
const baseUrl = "https://www.campadk.com";
require("dotenv").config();

const headers = {
  Cookie: `PHPSESSID=${process.env.PHPSESSID}; nyscp_auth=${process.env.nyscp_auth}`,
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
};
async function fetchHTML(url, retries = 3, retryDelay = 1000) {
  try {
    const { data } = await axios.get(url, {
      // Include cookies in the headers
      headers,
    });
    return cheerio.load(data);
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying... ${retries} attempts left`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Wait for retryDelay ms
      return fetchHTML(url, retries - 1, retryDelay); // Recursive call with decremented retries
    } else {
      console.log("Error fetching HTML :", url);
      throw error; // Rethrow error after all retries are exhausted
    }
  }
}

async function processCampgroundPage() {
  const $ = await fetchHTML(`${baseUrl}/campsitephotos/selectcampground`);

  const campgrounds = [];
  $("ul.camplist li").each((i, elem) => {
    const waterIcon = $(elem).find("a:nth-child(2) span.watericon");
    if (waterIcon.length) {
      const href = $(elem).find("a:first-of-type").attr("href");
      if (href) {
        campgrounds.push(`${baseUrl}${href}/choosesite`);
      }
    }
  });

  for (const campgroundUrl of campgrounds) {
    // Specify the path and file name for the output file

    const filePath = "./CampList.txt";
    try {
      await fs.writeFile(filePath, `${campgroundUrl}\n`, { flag: "a" }); // Append mode
      console.log(`Status written to ${filePath}`);
    } catch (error) {
      console.error("Error writing to file:", error);
    }
  }
}

async function processCampList() {
  let camplist = [];
  try {
    const filePath = "./CampList.txt";
    camplist = (await fs.readFile(filePath)).toString().split("\n");

    console.log(`Read ${camplist.length} campgrounds from ${filePath}`);
  } catch (error) {
    console.error("Error writing to file:", error);
  }

  for await (const campgroundUrl of camplist) {
    try {
      const OutPutFilePath = "./statusOutput.txt";
      await fs.writeFile(
        OutPutFilePath,
        `\n\nProcessing new camp\n${campgroundUrl}\n\n\n\n\n`,
        {
          flag: "a",
        }
      ); // Append mode
    } catch (error) {
      console.error("Error writing to file 'Processing new camp'", error);
    }

    console.log(`Processing ${campgroundUrl}`);
    await processCampsitePage(campgroundUrl);
  }
}

async function processCampsitePage(url) {
  const $ = await fetchHTML(url);

  const siteDetailsPages = [];
  $("div.areasites a").each(async (i, elem) => {
    if ($(elem).attr("class").includes("btn-onwater")) {
      siteDetailsPages.push(`${baseUrl}${$(elem).attr("href")}`);
    }
  });

  siteChunks = chunk(siteDetailsPages, 10);
  for await (const cunk of siteChunks) {
    await Promise.all(cunk.map((site) => processSitePage(site)));
  }
}

function chunk(array, chunk_size) {
  if (array.length == 0) return [];
  else return [array.splice(0, chunk_size)].concat(chunk(array, chunk_size));
}

async function processSitePage(url) {
  const $ = await fetchHTML(url);

  const nextAvailLink = $('a:contains("Check Next Avail")').attr("href");

  if (nextAvailLink) {
    await processSiteAvailabilitySet(nextAvailLink, url);
  }
}

async function processSiteAvailabilitySet(url, originalUrl) {
  const updatedUrl = url
    .replace("findavail=next", "####")
    .replace("/campsitephotos/redirect.php?", "");

  const urls = await Promise.all([
    await processSiteAvailability(
      updatedUrl.replace("####", "arvdate=07/13/2024")
    ),
    await processSiteAvailability(
      updatedUrl.replace("####", "arvdate=07/27/2024")
    ),
    await processSiteAvailability(
      updatedUrl.replace("####", "arvdate=08/10/2024")
    ),
    await processSiteAvailability(
      updatedUrl.replace("####", "arvdate=08/24/2024")
    ),
  ]);
  const filteredUrls = urls.filter((url) => url !== "");
  if (filteredUrls.length > 0) {
    // Specify the path and file name for the output file
    const filePath = "./statusOutput.txt";

    try {
      await fs.writeFile(
        filePath,
        `Site ${originalUrl}\n${filteredUrls.join("\n")}\n\n`,
        {
          flag: "a",
        }
      ); // Append mode
    } catch (error) {
      console.error("Error writing to file:", error);
    }
  }
}

async function processSiteAvailability(url) {
  try {
    const $ = await fetchHTML(url);

    const statusElement = $("div.td.status.a");

    if (statusElement.length > 1) {
      return url;
      //   // Specify the path and file name for the output file
      //   const filePath = "./statusOutput.txt";

      //   try {
      //     await fs.writeFile(filePath, `${url}\n`, { flag: "a" }); // Append mode
      //     //   console.log(`Status written to ${filePath}`);
      //   } catch (error) {
      //     console.error("Error writing to file:", error);
      //   }
    } else {
      return "";
      // console.log("Status div not found.");
    }
  } catch (error) {
    // console.log("Did not find site availability.", url);
    return "";
  }
}

processCampgroundPage()
  .catch(console.error)
  .then(() => {
    console.log("Done");
    processCampList().catch(console.error);
  });
