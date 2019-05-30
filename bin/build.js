const fs = require("fs");
const ncp = require("ncp").ncp;
const path = require("path");
const showdown = require("showdown");
const handlebars = require("handlebars");

const loadTemplate = async () => {
  const template = await loadFileAsString("./src/index.hbs");
  return handlebars.compile(template);
};

const distdir = src =>
  new Promise((resolve, reject) => {
    ncp(src, src.replace("src/", "dist/"), err => {
      if (err) return reject(err);
      resolve();
    });
  });

const mkdir = dirPath =>
  new Promise((resolve, reject) => {
    const dir = path.join(__dirname, dirPath);
    if (fs.existsSync(dir)) return resolve();
    fs.mkdir(dir, { recursive: true }, err => {
      if (!err) return resolve();
      reject(err);
    });
  });

const loadDir = filePath =>
  new Promise(resolve => {
    fs.readdir(filePath, function(err, files) {
      //handling error
      if (err) {
        return console.log("Unable to scan directory: " + err);
      }
      //listing all files using forEach
      resolve(
        files.map(file => {
          const extension = file.split(".").pop();
          return {
            name: file.replace(`.${extension}`, ""),
            path: path.join(__dirname, `../${filePath}/${file}`),
            link: `${filePath.replace("./src/", "/")}${file.replace(
              `.${extension}`,
              ".html"
            )}`,
            extension
          };
        })
      );
    });
  });

const loadFileAsString = filePath =>
  new Promise(resolve => {
    const file = fs.readFileSync(filePath, "utf8");
    resolve(file);
  });

const HTMLIntoTemplate = (fileString, template, data, location) => {
  const html = template(Object.assign(data, { content: fileString }));
  fs.writeFileSync(location, html, err => console.log(err));
};

const MDIntoTemplate = (fileString, template, data, location) => {
  const converter = new showdown.Converter();
  HTMLIntoTemplate(converter.makeHtml(fileString), template, data, location);
};

const filePathIntoTemplate = (filePath, template, data) => {
  const extension = filePath.split(".").pop();

  loadFileAsString(filePath).then(fileString => {
    const newlocation = filePath
      .replace("/src/", "/dist/")
      .replace(`.${extension}`, ".html");
    if (extension.toLowerCase() === "md") {
      MDIntoTemplate(fileString, template, data, newlocation);
    } else {
      HTMLIntoTemplate(fileString, template, data, newlocation);
    }
  });
};

const build = async () => {
  await mkdir("../dist");
  await mkdir("../dist/pages");
  await mkdir("../dist/posts");
  await distdir("./src/assets/");
  await distdir("./src/css/");
  const template = await loadTemplate();
  const pages = await loadDir("./src/pages/");
  const posts = await loadDir("./src/posts");

  await Promise.all(
    [...pages, ...posts].map(file =>
      filePathIntoTemplate(file.path, template, { pages, posts })
    )
  );
  console.log("done");
};

build();
