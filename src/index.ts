import puppeteer, { Page } from "puppeteer";
import { JSDOM } from "jsdom";
import { existsSync, readFileSync, writeFileSync } from "fs";

interface Book {
  Title: string;
  Author: string[];
  Img: any;
  Price: any;
  Publisher: string;
  Language: string;
  ISBN10: string;
  ISBN13: string;
  Item_Weight: string;
  Best_Sellers_Rank: any;
}

const dom = new JSDOM("body");
const window = dom.window;

const HOST = "https://amazon.com/dp";

const makeUrl = (host: string, id: string) => {
  return `${host}/${id}`;
};

const gotoNavigate = async (page: Page, url: string) => {
  try {
    console.log(`Loading: ${url}  ......`);
    await page.goto(url, {
      waitUntil: "load",
      timeout: 40000,
    });
    // await page.waitForNavigation({
    //     timeout: 0
    // });
    console.log(`Done.`);
  } catch (error) {}
};

const getBookIdFrom = async (page: Page, bodyObject: any) => {
  try {
    let dataID: string[] = [];

    // await bodyObject.window.document
    //   .querySelectorAll(".a-carousel-display-swap")
    //   .forEach(async (item: any) => {
    //     const content = item.getAttribute("data-a-carousel-options");
    //     const json_data = JSON.parse(content);

    //     const id_list: string[] = await json_data?.ajax?.id_list?.map(
    //       (item: any) => {
    //         return JSON.parse(item).id;
    //       }
    //     );
    //       console.log(content);
    //     dataID = [...dataID, ...new Set(id_list)];
    //   });

    dataID = JSON.parse(readFileSync(`input/id_list.json`).toString())

    dataID = [...new Set(dataID)];

    console.log("Book Id count:", dataID.length);

    return dataID;
  } catch (error) {
    return [];
  }
};

const main = async () => {
  // Configure puppeteer launch module
  const browser = await puppeteer.launch({
    args: [
      "--single-process",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--ignore-certificate-errors",
      "--ignore-certificate-errors-spki-list",
    ],
    // headless: "new",
    devtools: true,
  });

  // navigating with url.
  const page = (await browser.pages())[0];
  await gotoNavigate(page, "https://www.amazon.com/dp/0134805720");

  const bookInfos: Book[] = [];

  try {
    // getting body content
    const idListElement = await page.waitForSelector("body");
    const idListInnerHTML = await idListElement?.getProperty("innerHTML");
    let idListdomSTR = idListInnerHTML?.toString() || "";
    let idListdoc = new JSDOM(idListdomSTR);

    // getting book id
    const dataID = await getBookIdFrom(page, idListdoc);

    console.log("Start extrating ...");

    const len = dataID.length;
    for (let i = 0; i < len; i++) {
      try {
        const id = dataID[i];
        const url = makeUrl(HOST, id);

        // navigate to that page  (e.g    const page = (await browser.pages())[0];)
        await gotoNavigate(page, url);

        // extract book details

        const detail_info = await extractBookDetails(page);
        detail_info && bookInfos.push(detail_info);
        
      } catch (error) {}
    }
    writeFileSync("output/total.json", JSON.stringify(bookInfos));

    console.log("Book info counts: ", bookInfos.length);

    console.log("result", bookInfos);

    console.log("Finish extrating.", dataID);

  }catch(err) {}
  
};

const extractBookDetails = async (page: Page) => {
  
  console.log("Here is book Detail", 123345);
  const res: Book = {
    Title: "",
    Author: [],
    Img: {},
    Price: {},
    Publisher: "",
    Language: "",
    ISBN10: "",
    ISBN13: "",
    Item_Weight: "",
    Best_Sellers_Rank: {},
  };

  try {    
    await page.waitForSelector("#productTitle");
    await page.waitForSelector("#bylineInfo > span > a");
    await page.waitForSelector("#tmmSwatches .slot-title span");

    //// Get Title
    try {
      const titleElement = await page.waitForSelector("#productTitle");
      const titleInnerHTML =
        (await titleElement?.getProperty("innerHTML"))?.toString() || "";
      const Title = titleInnerHTML.split(": ")?.[1];

      res.Title = Title;

      console.log("Got Title", Title);
    } catch (error) {
      console.log(error)
    }
      
    //// Get Author
    try {
      const authorElement = await page.waitForSelector("#bylineInfo");
      const authorInnerHTML = await authorElement?.getProperty("innerHTML");
      let authordomSTR = authorInnerHTML?.toString() || "";

      res.Author = [];

      let authordoc = new JSDOM(authordomSTR);
      await authordoc.window.document
        .querySelectorAll(".author a")
        .forEach(async (item) => {
          res.Author.push(item.innerHTML);
        });

    console.log("Got all Author", res.Author);

    } catch (error) {
      console.log(error)
    }

    //// Get Image url
    try {
      res.Img = {};

      const Img: any = await page.evaluate(() => {
        const imgObject = {
          url: "",
          width: "",
          maxWidth: "",
          height: "",
          maxHeight: ""
        };
        const selector1 = window.document.querySelector("#imgBlkFront");
        const selector2 = window.document.querySelector("#ebooksImgBlkFront");
        
        const selector = selector1? selector1 : selector2;

        //@ts-ignore
        imgObject.url = selector?.getAttribute("src");
        //@ts-ignore
        imgObject.width =  selector?.style.Width || null;
        //@ts-ignore
        imgObject.maxWidth =  selector?.style.maxWidth || null;
        //@ts-ignore
        imgObject.height =  selector?.style.height || null;
        //@ts-ignores
        imgObject.maxHeight =  selector?.style.maxHeight || null;
       
          return (imgObject);
      });

      res.Img = Img;

    console.log("Got all Img", res.Img);
    } catch (error) {
      console.log(error);
    }

    //// Get Price
    try {
      const priceElement = await page.waitForSelector("#tmmSwatches .selected");
      const priceInnerHTML = await priceElement?.getProperty("innerHTML");
      let pricedomSTR = priceInnerHTML?.toString() || "";

      let pricedoc = new JSDOM(pricedomSTR);
      const titleSpans = pricedoc.window.document.querySelectorAll(".slot-title");

      const Price = {};
      await titleSpans.forEach((element) => {
        //@ts-ignore
        const key = element.querySelector("span").innerHTML.replaceAll(" ", "");
        //@ts-ignore
        const value = element.nextElementSibling.querySelector("span").innerHTML;
        //@ts-ignore
        Price[key] = value;
      });

      res.Price = Price;

      console.log("Got all Price", Price);
    } catch (error) {
      console.log(error)
    }   

    //// getting details such as Publisher, Language, Item Weight, etc.
    try {
      const detaildata:any = {};

      const detaildataElement = await page.waitForSelector("#detailBullets_feature_div");
      const detaildataInnerHTML = await detaildataElement?.getProperty("innerHTML");
      let detaildatadomSTR = detaildataInnerHTML?.toString() || "";

      let detaildatadoc = new JSDOM(detaildatadomSTR);
      const detaildataSpans = await detaildatadoc.window.document.querySelectorAll("ul li");
      
      
      await detaildataSpans.forEach((element) => {
        // @ts-ignore
          const cat = element.querySelector("span span:nth-child(1)");
          // @ts-ignore
          const val = element.querySelector("span span:nth-child(2)");
          if( cat && val){
            // @ts-ignore
            detaildata[cat.innerHTML.trim()] = val.innerHTML.trim();
          }
        })

      const trimmedBookInfo:any = {};
      for (const key in detaildata) {
        try{
          const trimmedKey = key.trim().replace(/[\n‏:‎]/g, '').trim();
          trimmedBookInfo[trimmedKey] = detaildata[key];
        } catch(err){}
      }

      const cleanedBookInfo:any = {};
      for (const key in trimmedBookInfo) {
        try{
          const cleanedKey = key.replace(/[^\w\s-]/g, '').replace(/-/g, '').replace(" ", '').trim();
          cleanedBookInfo[cleanedKey] = trimmedBookInfo[key];
        } catch(err) {}
      }

      console.log("This is ISBN: ", cleanedBookInfo);

      res.Publisher = cleanedBookInfo.Publisher;
      res.Language = cleanedBookInfo.Language;
      res.ISBN10 = cleanedBookInfo.ISBN10;
      res.ISBN13 = cleanedBookInfo.ISBN13;
      res.Item_Weight = cleanedBookInfo.ItemWeight;

    } catch (error) {}

    //// Get Best_Sellers_Rank
    try {
      const Best_Sellers_Rank_element = await page.evaluate(() => {
        // @ts-ignore
        return (
          window.document
            .querySelector(
              "#detailBulletsWrapper_feature_div > ul:nth-child(4) > li > span"
            )
            ?.innerHTML.toString()
            ?.replace(" (See Top 100 in Books)", "") || ""
        );
      });
      const Best_Sellers_Rank:any = Best_Sellers_Rank_element.split(": ")?.[1];
  
      // Extract the rank information using regular expressions
      const bookRank = Best_Sellers_Rank.match(/#(\d+,\d+) in Books/)[1];
      const categoryRanks = Best_Sellers_Rank.matchAll(/#(\d+) in <a href=".+?">(.+?)<\/a><\/span><\/li>/g);
      
      // Create the rank object dynamically
      const Best_Sellers_Rank_Object:any = {};
      Best_Sellers_Rank_Object.Books = bookRank;
      for (const match of categoryRanks) {
        const rank = match[1];
        const category = match[2].replace(/ /g, '');
        Best_Sellers_Rank_Object[category] = rank;
      }
      
      res.Best_Sellers_Rank = Best_Sellers_Rank_Object;
  
      console.log("Got all data", Best_Sellers_Rank_Object);
  
    } catch (error) {
      console.log(error);
    }

    console.log(res);
    return res;
  } catch (err) {}
};

main();
