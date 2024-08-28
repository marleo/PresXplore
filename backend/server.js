const config = require("./local-config.js");
const WebSocket = require("ws");
const cors = require("cors");
const fs = require("fs");

const { v4: uuidv4 } = require("uuid");

const LOGFILE = "vbsqueryserverlog.json";

const DISTINCTIVE_L2DIST1 = 10.0;
const DISTINCTIVE_L2DIST2 = 15.0;

const CLIPSERVERURL = "ws://" + config.config_CLIP_SERVER;
console.log(CLIPSERVERURL);

const wss = new WebSocket.Server({ noServer: true }); //web socket to client
let clipWebSocket = null;

const mongouri = "mongodb://" + config.config_MONGODB_SERVER; // Replace with your MongoDB connection string
const MongoClient = require("mongodb").MongoClient;
let mongoclient = null;
connectMongoDB();

// Variables to store the parameter values
let filename;

//store submitted videos
let submittedVideos = [];
class QuerySettings {
  constructor(
    combineCLIPwithMongo = false,
    combineCLIPwithCLIP = 0,
    videoFiltering = "all"
  ) {
    this.combineCLIPwithMongo = combineCLIPwithMongo;
    this.combineCLIPwithCLIP = combineCLIPwithCLIP;
    this.videoFiltering = videoFiltering;
  }
}

let settingsMap = new Map();

//////////////////////////////////////////////////////////////////
// Connection to client
//////////////////////////////////////////////////////////////////
const express = require("express");
const app = express();
app.use(cors());
const port = 8080;
const server = app.listen(port, () => {
  console.log("WebSocket server is running on port " + port);
});

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

let clients = new Map();

wss.on("connection", (ws) => {
  let clientId = uuidv4();
  clients.set(clientId, ws);
  console.log("client connected: %s", clientId);
  let clientSettings = new QuerySettings();
  settingsMap.set(clientId, clientSettings);

  if (submittedVideos.length > 0) {
    broadCastMessage({ type: "updatesubmissions", videoId: submittedVideos });
  }

  if(clipWebSocket === null) {
    connectToClipServer();
  }

  ws.on("message", (message) => {
    console.log("received from client: %s (%s)", message, clientId);
    msg = JSON.parse(message);
    fs.appendFile(LOGFILE, JSON.stringify(msg), function (err) {
      if (err) {
        console.log("Error writing file", err);
      }
    });

    videoFiltering = msg.content.videofiltering;
    clientSettings.videoFiltering = videoFiltering;
    if (videoFiltering == "first") {
      msg.content.resultsperpage = msg.content.maxresults;
      msg.content.selectedpage = 1;
    }

    if (msg.content.type === "clusters") {
      queryClusters(clientId);
    } else if (msg.content.type === "videoinfo") {
      getVideoInfo(clientId, msg.content);
    } else if (msg.content.type === "videofps") {
      getVideoFPS(clientId, msg.content, msg.correlationId);
    } else if (
      msg.content.type === "ocr-text" ||
      msg.content.type === "speech"
    ) {
      queryText(clientId, msg.content);
    } else if (msg.content.type === "videoid") {
      queryVideoID(clientId, msg.content);
    } else if (msg.content.type === "resetsubmission") {
      submittedVideos = [];
    } else {
      if (clipWebSocket === null) {
        console.log("clipWebSocket is null");
      } else {
        msg.clientId = clientId;

        if (msg.content.type === "textquery") {
          lenBefore = msg.content.query.trim().length;
          clipQuery = parseParameters(msg.content.query);

          if (clipQuery.trim().length > 0) {
            msg.content.query = clipQuery;
            msg.content.clientId = clientId;

            if (clipQuery.length !== lenBefore) {
              msg.content.resultsperpage = msg.content.maxresults;
            }

            console.log(
              'sending to CLIP server: "%s" len=%d content-len=%d (rpp=%d, max=%d) - %d %d %d',
              clipQuery,
              clipQuery.length,
              msg.content.query.length,
              msg.content.resultsperpage,
              msg.content.maxresults,
              clipQuery.length,
              msg.content.query.trim().length,
              lenBefore
            );

            let clipQueries = Array();
            let tmpClipQuery = clipQuery;
            if (tmpClipQuery.includes("<")) {
              let idxS = -1;
              do {
                idxS = tmpClipQuery.indexOf("<");
                if (idxS > -1) {
                  clipQueries.push(tmpClipQuery.substring(0, idxS));
                  tmpClipQuery = tmpClipQuery.substring(idxS + 1);
                } else {
                  clipQueries.push(tmpClipQuery);
                }
              } while (idxS > -1);
              console.log("found " + clipQueries.length + " temporal queries:");
              for (let i = 0; i < clipQueries.length; i++) {
                console.log(clipQueries[i]);
              }
            }

            if (clipQueries.length > 0) {
              clientSettings.combineCLIPwithCLIP = clipQueries.length;
              for (let i = 0; i < clipQueries.length; i++) {
                let tmsg = msg;
                tmsg.content.query = clipQueries[i];
                tmsg.content.resultsperpage = tmsg.content.maxresults;
                clipWebSocket.send(JSON.stringify(tmsg));
              }
              clipQueries = Array();
            } else {
              clipWebSocket.send(JSON.stringify(msg));
            }
          }
        } else if (msg.content.type === "similarityquery") {
          clipWebSocket.send(JSON.stringify(msg));
        } else if (msg.content.type === "file-similarityquery") {
          clipWebSocket.send(JSON.stringify(msg));
        }
      }
    }
  });

  ws.on("close", function close() {
    console.log("client disconnected");
    clients.delete(clientId);
    mongoclient.close();
  });
});

//////////////////////////////////////////////////////////////////
// Parameter Parsing
//////////////////////////////////////////////////////////////////

function parseParameters(inputString) {
  const regex = /-([a-zA-Z]+)\s(\S+)/g;

  filename = similarto = "";

  let match;
  while ((match = regex.exec(inputString.trim()))) {
    const [, parameter, value] = match;

    switch (parameter) {
      case "fn":
        filename = value;
        break;
      case "sim":
        similarto = value;
        break;
    }
  }

  console.log(
    "filters: text=%s concept=%s object=%s place=%s weekday=%s day=%s month=%s year=%s filename=%s",
    filename
  );

  const updatedString = inputString.replace(regex, "").trim();

  return updatedString.trim();
}

function getVideoId(result) {
  const elem = result;
  let filename = elem.split("/");
  let framenumber = filename[0];
  let videoid = framenumber.substring(0, framenumber.lastIndexOf("_"));
  return videoid;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

//////////////////////////////////////////////////////////////////
// CLIP Queries
//////////////////////////////////////////////////////////////////

function connectToClipServer() {
  try {
    console.log("trying to connect to CLIP...");
    clipWebSocket = new WebSocket(CLIPSERVERURL);

    clipWebSocket.on("open", () => {
      console.log("connected to CLIP server");
    });

    clipWebSocket.on("close", (event) => {
      // Handle connection closed
      clipWebSocket.close();
      clipWebSocket = null;
      console.log(
        "Connection to CLIP closed",
        event.code,
        event.reason
      );
    });

    pendingCLIPResults = Array();

    clipWebSocket.on("message", (message) => {
      handleCLIPResponse(message);
    });

    clipWebSocket.on("error", (event) => {
      console.log("Connection to CLIP refused");
    });
  } catch (error) {
    console.log("Cannot connect to CLIP server");
    console.log(error);
  }
}

function handleCLIPResponse(message) {
  msg = JSON.parse(message);
  numbefore = msg.results.length;
  clientId = msg.clientId;
  clientWS = clients.get(clientId);
  let clientSettings = settingsMap.get(clientId);

  console.log("received %s results from CLIP server", msg.num);

    let filteredResults = Array();
    let filteredResultsIdx = Array();
    let filteredScores = Array();
    let videoIds = Array();
    let countFiltered = 0;
    for (let i = 0; i < msg.results.length; i++) {
      let videoid = getVideoId(msg.results[i]);
      if (
        clientSettings.videoFiltering === "first" &&
        videoIds.includes(videoid)
      ) {
        countFiltered++;
        continue;
      }
      videoIds.push(videoid);
      filteredResults.push(msg.results[i].split("/")[1]);
      filteredResultsIdx.push(msg.resultsidx[i]);
      filteredScores.push(msg.scores[i]);
    }

    msg.results = filteredResults;
    msg.resultsidx = filteredResultsIdx;
    msg.scores = filteredScores;
    msg.totalresults = msg.totalresults - countFiltered;
    msg.num = msg.num - countFiltered;
    console.log(
      "forwarding %d results (current before=%d) to client %s",
      msg.totalresults,
      numbefore,
      clientId
    );
    console.log(JSON.stringify(msg));
    clientWS.send(JSON.stringify(msg));

    // Append jsonString to the file
    msg.clientId = clientId;
    fs.appendFile(LOGFILE, JSON.stringify(msg), function (err) {
      if (err) {
        console.log("Error writing file", err);
      }
    });
}

//////////////////////////////////////////////////////////////////
// MongoDB Queries
//////////////////////////////////////////////////////////////////

function connectMongoDB() {
  mongoclient = new MongoClient(mongouri);
  mongoclient.connect((err) => {
    if (err) {
      console.error("error connecting to mongodb: ", err);
      return;
    }
  });

  mongoclient.on("close", () => {
    console.log("mongodb connection closed");
  });
}

async function getVideoFPS(clientId, queryInput, correlationId) {
  try {
    const database = mongoclient.db(config.config_MONGODB);
    const collection = database.collection("videos");

    let projection = { fps: 1, duration: 1 };

    let query = {};
    query = { videoid: queryInput.videoid };

    const cursor = collection.find(query, { projection: projection });
    let results = [];
    await cursor.forEach((document) => {
      results.push(document);
    });

    let response = {
      type: "videofps",
      synchronous: queryInput.synchronous,
      videoid: queryInput.videoid,
      fps: results[0].fps,
      duration: results[0].duration,
      correlationId: correlationId,
    };
    clientWS = clients.get(clientId);
    clientWS.send(JSON.stringify(response));
  } catch (error) {
    console.log("error with mongodb: " + error);
    await mongoclient.close();
  }
}

async function getVideoInfo(clientId, queryInput) {
  try {
    const database = mongoclient.db(config.config_MONGODB);
    const collection = database.collection("videos");

    let query = {};
    query = { videoid: queryInput.videoid };

    const cursor = collection.find(query);
    let results = [];
    await cursor.forEach((document) => {
      results.push(document);
    });

    let response = { type: "videoinfo", content: results };
    clientWS = clients.get(clientId);
    clientWS.send(JSON.stringify(response));
  } catch (error) {
    console.log("error with mongodb: " + error);
    await mongoclient.close();
  }
}

async function queryText(clientId, queryInput) {
  try {
    let clientSettings = settingsMap.get(clientId);
    const database = mongoclient.db(config.config_MONGODB);

    let collectionType = "";

    if (queryInput.type == "ocr-text") {
      collectionType = "texts";
    } else if (queryInput.type == "speech") {
      collectionType = "speech";
    }

    const collection = database.collection(collectionType);
    let page = parseInt(queryInput.selectedpage);
    let pageSize = parseInt(queryInput.resultsperpage);
    let commonFrames = new Set();
    let totalDocuments = 0;
    let words = queryInput.query.split(/\s+/);
    const escapedWords = words.map((word) => escapeRegExp(word));
    const regexQuery = new RegExp(escapedWords[0], "i");

    words = words.map((word) => word.toLowerCase());

    console.log(
      console.log("received from client: %s (%s)", queryInput, clientId)
    );

    if (words.length === 1) {
      const cursor = collection.find({
        text: { $regex: regexQuery },
      });

      totalDocuments = await cursor.count();
      const documents = await cursor.toArray();

      let framesSet = new Set();
      documents.forEach((doc) => {
        console.log("Processing document:", doc);
        doc.frames.forEach((frame) => {
          console.log("Adding frame to set:", frame);
          framesSet.add(frame);
        });
      });

      let framesArray = Array.from(framesSet);
      totalDocuments = framesArray.length;

      let frameSkip = (page - 1) * pageSize;

      if (framesArray.length > pageSize) {
        framesArray = framesArray.slice(frameSkip, frameSkip + pageSize);
      }

      commonFrames = new Set(framesArray);
    } else {
      let words = queryInput.query
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 0);

      if (words.length === 0) {
        commonFrames = new Set();
      } else {
        let framesMap = new Map();

        for (let word of escapedWords) {
          let regex = new RegExp(word, "i");

          let matchedDocuments = await collection
            .find({
              text: { $regex: regex },
            })
            .toArray();

          matchedDocuments.forEach((doc) => {
            doc.frames.forEach((frame) => {
              if (framesMap.has(frame)) {
                framesMap.get(frame).add(word);
              } else {
                framesMap.set(frame, new Set([word]));
              }
            });
          });
        }

        let commonFramesSet = new Set();
        framesMap.forEach((wordsSet, frame) => {
          if (wordsSet.size === words.length) {
            commonFramesSet.add(frame);
          }
        });

        let framesArray = Array.from(commonFramesSet);
        totalDocuments = framesArray.length;

        let frameSkip = (page - 1) * pageSize;
        framesArray = framesArray.slice(frameSkip, frameSkip + pageSize);

        commonFrames = new Set(framesArray);
      }
    }

    let response = {
      type: collectionType,
      num: commonFrames.size,
      results: Array.from(commonFrames),
      totalresults: totalDocuments,
      scores: new Array(commonFrames.size).fill(1),
      dataset: "esop",
    };

    if (clientSettings.videoFiltering === "first") {
      let filteredFrames = [];
      let videoIds = [];

      commonFrames.forEach((frame) => {
        let videoId = getVideoId(frame);
        if (!videoIds.includes(videoId)) {
          videoIds.push(videoId);
          filteredFrames.push(frame);
        }
      });
      response.num = filteredFrames.length;
      response.totalresults = totalDocuments;
      response.results = filteredFrames;
    }

    clientWS = clients.get(clientId);
    clientWS.send(JSON.stringify(response));
  } catch (error) {
    console.log("error with mongodb: " + error);
    await mongoclient.close();
  }
}

async function queryVideoID(clientId, queryInput) {
  try {
    let clientSettings = settingsMap.get(clientId);
    const database = mongoclient.db(config.config_MONGODB);
    const collection = database.collection("videos");

    let cursor;
    if (
      queryInput.query === "*" &&
      queryInput.dataset === "lhe" &&
      queryInput.videofiltering === "first"
    ) {
      cursor = await collection
        .find({ videoid: { $regex: "LHE??" } })
        .sort({ videoid: 1 });
    } else if (
      queryInput.query === "*" &&
      (queryInput.dataset === "mvk" || queryInput.dataset === "esop") &&
      queryInput.videofiltering === "first"
    ) {
      cursor = await collection
        .find({ videoid: { $regex: ".*_.*_.*" } })
        .sort({ videoid: 1 });
    } else if (queryInput.query !== "*") {
      cursor = await collection
        .find({ videoid: { $regex: queryInput.query, $options: "i" } })
        .sort({ videoid: 1 });
    }

    let response = {
      type: "videoid",
      num: 0,
      results: [],
      totalresults: 0,
      scores: [],
      dataset: "v3c",
    };

    if (cursor !== undefined) {
      let results = [];
      let scores = [];
      let videoIds = Array();
      await cursor.forEach((document) => {
        for (const shot of document.shots) {
          if (
            clientSettings.videoFiltering === "first" &&
            videoIds.includes(document.videoid)
          ) {
            continue;
          }
          videoIds.push(document.videoid);
          results.push(shot.keyframe);
          scores.push(1);
        }
      });
      response.num = results.length;
      response.totalresults = results.length;
      response.scores = scores;
      response.results = results;
    }

    clientWS = clients.get(clientId);
    clientWS.send(JSON.stringify(response));
  } catch (error) {
    console.log("error with mongodb: " + error);
    await mongoclient.close();
  }
}
