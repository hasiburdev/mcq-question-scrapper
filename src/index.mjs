import puppeteer from "puppeteer";
import { json2csv } from "json-2-csv";
import { writeFile } from "fs/promises";

const config = {
  questionStart: 71,
  questionEnd: 100,
  subject: "পদার্থবিজ্ঞান প্রথম পত্র",
  chapter: "",
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getSerialNumber = async (page) => {
  return page.evaluate(() => {
    const questionCardElements = document.querySelectorAll(".q-card");
    return parseInt(
      questionCardElements[questionCardElements.length - 1].querySelector(
        ".question p.serial-number"
      ).innerHTML
    );
  });
};

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: {
    width: 1000,
    height: 800,
  },
  userDataDir: "temp",
  slowMo: 100,
});

const page = await browser.newPage();

await page.goto("https://aapathshala.com/qbs", {
  waitUntil: "networkidle2",
  timeout: 60000,
});

await page.waitForSelector(".folder");
const nextButton = await page.waitForSelector("li.page-item span.page-link");
await nextButton.scrollIntoView();
await nextButton.click();
await delay(3000);

const serialNumber = await getSerialNumber(page);

if (serialNumber < 50) {
  await page.click("li.page-item span.page-link");
  await delay(3000);
}

while (serialNumber < config.questionEnd) {
  const nextButton = await page.waitForSelector("li.page-item span.page-link");
  await nextButton.scrollIntoView();
  await nextButton.click();
  await delay(3000);
  const serialNumber = await getSerialNumber(page);
  if (serialNumber > config.questionEnd) {
    break;
  }
}

const content = await page.evaluate(() => {
  const config = {
    questionStart: 1,
    questionEnd: 120,
    subject: "",
    chapter: "",
  };

  const questionCardElements = document.querySelectorAll(".q-card");

  return [...questionCardElements]
    .slice(config.questionStart - 1, config.questionEnd)
    .map((questionCardElement) => {
      const questionText = questionCardElement.querySelector(
        ".question-body p strong span"
      ).innerHTML;

      const answerQptionElements = questionCardElement.querySelectorAll(
        ".answer-wrapper ol li.option label"
      );
      const answers = [...answerQptionElements].map((answerQptionElements) => {
        return answerQptionElements.innerHTML;
      });

      const correctAnswer = questionCardElement.querySelector(
        ".answer-wrapper ol li.answer label"
      ).innerHTML;

      const correctAnswerIndex = answers.indexOf(correctAnswer);
      const correctAnswerInfo =
        questionCardElement.querySelector("blockquote").innerHTML;

      return {
        question: questionText,
        options: [...answers],
        correctAnswer,
        correctAnswerIndex,
        correctAnswerInfo,
      };
    });
});

const csvContent = [];

for (let i = 0; i < content.length * 5; i++) {
  const questionIndex = Math.floor(i / 5);
  const answerIndex = i % 5;
  if (answerIndex === 0) {
    csvContent.push({
      "Item Type": "Question",
      "Question Title": content[i / 5].question,
      "Question Description": "",
      "Answer Text": "",
      "Answer Point": "",
      "Answer Correct/InCorrect": "",
      "Answer Caption": "",
      "Answer label": "",
      "Question Answer Info": content[questionIndex].correctAnswerInfo,
      Comments: 1,
      Hints: "",
      "Question Type New": "",
      Required: 1,
      "Require all rows": "",
      "Answer Editor": "text",
      "Feature Image Src": "",
      "Match Answer": "",
      "Case Sensitive": "",
      "Answer Columns": "",
      "Image Size-Width": "",
      "Image Size-Height": "",
      Autofill: "",
      "Text Limit": "",
      "Limit Multiple Response": "",
      "File Upload Limit": "",
      "File Upload Type": "",
      Categories: "",
    });
  } else {
    csvContent.push({
      "Item Type": "Answer",
      "Question Title": "",
      "Question Description": "",
      "Answer Text": content[questionIndex].options[answerIndex - 1],
      "Answer Point":
        content[questionIndex].correctAnswerIndex === answerIndex - 1
          ? 1
          : -0.25,
      "Answer Correct/InCorrect":
        content[questionIndex].correctAnswerIndex === answerIndex - 1 ? 1 : "",
      "Answer Caption": "",
      "Answer label": "",
      "Question Answer Info": "",
      Comments: "",
      Hints: "",
      "Question Type New": "",
      Required: "",
      "Require all rows": "",
      "Answer Editor": "",
      "Feature Image Src": "",
      "Match Answer": "",
      "Case Sensitive": "",
      "Answer Columns": "",
      "Image Size-Width": "",
      "Image Size-Height": "",
      Autofill: "",
      "Text Limit": "",
      "Limit Multiple Response": "",
      "File Upload Limit": "",
      "File Upload Type": "",
      Categories: "",
    });
  }
}

const csv = await json2csv(csvContent);

await writeFile("questions.csv", csv, "utf-8");

await browser.close();
