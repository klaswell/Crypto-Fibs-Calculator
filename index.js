const AWS = require ('aws-sdk');
AWS.config.update({region: 'us-east-2'});  // Set the region 
var ddb = new AWS.DynamoDB.DocumentClient();


// DEFINE COINGECKO.COM'S API AS A NEW SERVICE
const svc = new AWS.Service({
    endpoint: 'https://api.coingecko.com/api/v3',  // API base URL
 
    // don't parse API responses
    // (this is optional if you want to define shapes of all your endpoint responses)
    convertResponseTypes: false,
 
    // our API endpoints
    apiConfig: {
        metadata: {
            protocol: 'rest-json'
        },
        operations: {
            Ping: {
                http: {
                    method: 'GET',
                    // note the placeholder in the URI
                    requestUri: '/ping'
                },
                input: {
                    type: 'structure',
                    required: [ ]
                }
            },
            
            GetSimplePrice: {
                http: {
                    method: 'GET',
                    requestUri: '/simple/price'
                },
                input: {
                    type: 'structure',
                    required: ['ids', 'vs_currencies'],
                    members: {
                        'ids': {
                            location: 'querystring',
                            locationName: 'ids'
                        },
                        'vs_currencies': {
                            location: 'querystring',
                            locationName: 'vs_currencies',
                        },
                        'include_market_cap': {
                            location: 'querystring',
                            locationName: 'include_market_cap'
                        }
                    }
                }
            },
            
            GetCoinList: {
                http: {
                    method: 'GET',
                    requestUri: '/coins/list'
                },
                input: {
                    type: 'structure',
                    required: [],
                    members: {
                        'ids': {
                            location: 'querystring',
                            locationName: 'include_platform'
                        }
                    }
                }
            },
            
            GetCoinHistory: {
                http: {
                    method: 'GET',
                    requestUri: '/coins/{id}/history'
                },
                input: {
                    type: 'structure',
                    required: ['id', 'date'],
                    members: {
                        'id': {
                            location: 'uri',
                            locationName: 'id'
                        },
                        'date': {
                            location: 'querystring',
                            locationName: 'date',
                        },
                        'localization': {
                            location: 'querystring',
                            locationName: 'localization'
                        }
                    }
                }
            },
            
            GetMarketChartRange: {
                http: {
                    method: 'GET',
                    requestUri: '/coins/{id}/market_chart/range'
                },
                input: {
                    type: 'structure',
                    required: ['id', 'vs_currency', 'from', 'to'],
                    members: {
                        'id': {
                            location: 'uri',
                            locationName: 'id'
                        },
                        'vs_currency': {
                            location: 'querystring',
                            locationName: 'vs_currency'
                        },
                        'from': {
                            location: 'querystring',
                            locationName: 'from'
                        },
                        'to': {
                            location: 'querystring',
                            locationName: 'to'
                        }
                    }
                }
            }
        }
    }
});


// UNIX time definitions
const unix27April2013 = 1367020800;
const unix2016 = 1451606400;
const unix2017 = 1483228800;
const unix2018 = 1514764800000;
const unix2019 = 1546300800;
const unix2020 = 1577836800;
const unix13March2020 = 1584057600;
const unix01May2020 = 1588291200;
const unix2021 = 1609459200;
const unix2022 = 1640995200000;
const unixNow = Math.floor(new Date().getTime()/1000.0);

// Define defaults variables to make it easy to change in the future
const defaultFrom = unix2016;
const defaultTo = unix01May2020;
const defaultVsCurrency = 'usd';


// MAIN CODE
exports.handler = async function (event, context, callback) {


// ORIGIN VALIDATION
    const origin = event.headers.origin;
  
    if (!(origin == "https://kodylaswell.com" || origin == "https://www.kodylaswell.com")) {
        console.log("Origin " + origin + " is not valid");
        var response = createResponse(403, "Origin is not valid");
        return response;
    } else console.log("Origin " + origin + " is valid");
    

// DEFINE VARIABLES FROM BODY
    const body = JSON.parse(event.body);
    const coin = body.coin.toLowerCase();
    var vsCurrency = body.vsCurrency.toLowerCase();
    var from = body.from;
    var to = body.to;


    console.log("Form input received: " + coin + ", vsCurrency: " + vsCurrency + ", from: " + from + ", to: " + to);


// BODY VALIDATION
    // Assign 'to', 'from', and 'vsCurrency' to defaults if they weren't in the request, or validate them if they were
    // Return error resonse if validation fails
    if (!from) {
        from = defaultFrom;
    } else if (!validateDate(from)) {
        const response = createResponse(422, "Error: from date is invalid");
        return response;
    }
    
    if (!to) {
        to = defaultTo;
    } else if (!validateDate(to)) {
        const response = createResponse(422, "Error: to date is invalid");
        return response;
    }

    if (!vsCurrency) {
        vsCurrency = defaultVsCurrency;
    } else if (!validateVsCurrency(vsCurrency)) {
        const response = createResponse(422, "Error: vs currency is invalid");
        return response;
    }

    // Make sure the dates make sense
    if (to <= from) {
        const response = createResponse(422, "Error: to cannot be less than from");
        return response;
    }
    

// FOR CHECKING COIN AGAINST COINGECKO'S LIST; UNUSED
//    var coinList = await GetCoinList();
//    console.log(coinList);
//    let coinFound = coinList.find();
//    let success = coinList.find(success => success.name === "bitcoin");
//    console.log(coinFound);


// CHECK FOR ALL DEFAULTS
    if ((from == defaultFrom) && (to == defaultTo) && (vsCurrency == defaultVsCurrency)) {
        var allDefaults = true;
    } else {
        var allDefaults = false;
    }

// IF ALL DEFAULTS, CHECK DYNAMODB
    if (allDefaults == true) {
        const params = createParams(coin);
        
        try {
            var ddbCoin = await ddb.get(params).promise();
        } catch (err) {
            console.log(err);
            const response = createResponse(500, "Error: Something went wrong");
            return response;
            // End code if error occurs
        }
    }

// IF ALL DEFAULTS AND THE COIN EXISTS IN DYNAMODB, SEND IT BACK TO THE ORIGINAL REQUEST
    // Send back DynamoDB results
    if (allDefaults && ddbCoin.Item) {
        console.log(coin + " found in database; sending response");
            
        const response = createResponse(200, ddbCoin.Item);
        return response;
        // End code and send back DynamoDB results
    } else {
// OTHER SCENARIOS
        if ((allDefaults) && (!ddbCoin.Item)) {
            console.log("Coin " + coin + " not found in database");
        } else if (!allDefaults) {
            console.log("Dates and/or vs currency are not defaults");
        }


// DO COINGECKO API CALL AND CRUNCH SOME NUMBERS
        console.log("Calling CoinGecko API");
        
        try {
            const results = await GetMarketChartRange(coin, vsCurrency, from.toString(), to.toString());
            // 'results' array contains: 'prices', 'market_caps', 'total_volumes'
            
            const prices = results.prices;

            // Sort array of arrays 'prices', largest to smallest
            const sort = prices.sort(function (a, b) { return b[1] - a[1] });

            // Get stats from the 'sort' array, then get rid of any prices that occured before the highest price
            const sortedStats = createSortedStats(sort);
            const reducedSortedStats = createReducedSortedStats(sort, sortedStats.maxPriceTimestamp);

            // Define stats from the new sorted and reduced array
            const maxPrice = reducedSortedStats.maxPrice;
            const minPrice = reducedSortedStats.minPrice;
            const maxPriceTimestamp = reducedSortedStats.maxPriceTimestamp;
            const minPriceTimestamp = reducedSortedStats.minPriceTimestamp;
            const fib = calculateFib(maxPrice, minPrice);


            console.log("High: " + maxPrice + "; Low: " + minPrice);
            console.log("Fibonacci numbers calculated");
            
            
// IF ALL DEFAULTS, MAKE A NEW DYNAMODB ENTRY
            if (allDefaults) {
                var putParams = createPutParams(coin, vsCurrency, maxPrice, minPrice, maxPriceTimestamp, minPriceTimestamp, fib);
    
                try {
                    // Put to DynamoDB with new coin
                    await ddb.put(putParams).promise();
                    console.log("Successfully added " + coin + " to database");
                } catch (err) {
                    console.log("There was an error adding " + coin + " to database");
                    console.log(err);
                }
            }
            
// SEND COIN STATS BACK TO THE ORIGINAL REQUEST
            const coinObj = createCoinObj(coin, vsCurrency, maxPrice, minPrice, maxPriceTimestamp, minPriceTimestamp, fib);
            
            console.log("Sending response");
            
            const response = createResponse(200, coinObj);
            return response;
       
        } catch (err) {  // Catch errors from GetMarketChartRange
            console.log(err);
            
            var response = createResponse(422, "Error: Something went wrong calling the API");
            return response;
        }
    }
};


// disable AWS region related login in the SDK
svc.isGlobalEndpoint = true;
 
function Ping () {
    svc.ping({}, (err, data) => {
        if (err) {
            console.error("error");
//            return callback(err);
        }
        console.log('data:', data);
    });
}

async function GetCoinList () {
    const results = await svc.getCoinList({
       // include_platform: include_platform
    }, (err, data) => {
        if (err) {
            console.error("Error: GetCoinList");
        }
//        console.log('data:', data);
    }).promise();
    
    return results;
}

function GetSimplePrice (ids, vs_currencies, include_market_cap) {
    svc.getSimplePrice({
            ids: ids,
            vs_currencies: vs_currencies,
            include_market_cap: include_market_cap
    }, (err, data) => {
        if (err) {
            console.error("error");
//            return callback(err);
        }
        console.log('data:', data);
    });
}

function GetCoinHistory (id, date) {
    svc.getCoinHistory({
            id: id,
            date: date   //dd-mm-yyyy
//            localization: false //exludes localized languages in response
    }, (err, data) => {
        if (err) {
            console.error("error");
//            return callback(err);
        }
        console.log('data:', data);
    });
}

async function GetMarketChartRange (id, vsCurrency, from, to) {
    const results = await svc.getMarketChartRange({
        id: id,
        vs_currency: vsCurrency,
        from: from,
        to: to
    }, (err, data) => {
        if (err) {
            console.error("error in getMarketChartRange");
        }
        console.log('data:', data);
    }).promise();
    
    return results;
}

function validateCoinName (name) {
	const lettersAndDash = /^[A-Za-z-]+$/;

	if (name.match(lettersAndDash)) {
		return true;
	} else {
		return false;
	}
}

function validateVsCurrency (vsCurrency) {
	const letters = /^[A-Za-z]+$/;

	if (vsCurrency.match(letters)) {
		return true;
	} else {
		return false;
	}
}

function validateDate (date) {
//    const numbers = /^[0-9]+$/;
    
    if (!isNaN(date) && (date > unix27April2013) && (date <= unixNow)) {
        return true;
    } else {
        return false;
    }
    
}

function createResponse (code, body) {
    const response = {
        statusCode: code,
//        statusText: "name",
        headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers" : "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST"
        },
        body: (JSON.stringify(body))
    };
    console.log(response);

    return response;
}

function createParams (name) {
    const params = {
        TableName: 'crypto_fibonaccis',
        Key: {
            'coin' : name,
        }
    };
  
    return params;
}

function createPutParams (coin, vsCurrency, maxPrice, minPrice, maxPriceTimestamp, minPriceTimestamp, fib) {
    const params = {
        TableName: 'crypto_fibonaccis',
        Item: {
            "coin": coin,
            "vsCurrency": vsCurrency,
            "maxPrice": maxPrice,
            "minPrice": minPrice,
            "maxPriceTimestamp": maxPriceTimestamp,
            "minPriceTimestamp": minPriceTimestamp,
            ".236": fib.twoThreeSix,
            ".382": fib.threeEightTwo,
            ".5": fib.five,
            ".618": fib.sixOneEight,
            ".702": fib.sevenZeroTwo,
            ".786": fib.sevenEightSix,
            "1": fib.one,
            "1.618": fib.onePointSixOneEight,
            "2.618": fib.twoPointSixOneEight,
            "3.618": fib.threePointSixOneEight,
            "4.236": fib.fourPointTwoThreeSix
        }
    };
  
    return params;
}

function createCoinObj (coin, vsCurrency, maxPrice, minPrice, maxPriceTimestamp, minPriceTimestamp, fib) {
    const coinObj = {
        "coin": coin,
        "vsCurrency": vsCurrency,
        "maxPrice": maxPrice,
        "minPrice": minPrice,
        "maxPriceTimestamp": maxPriceTimestamp,
        "minPriceTimestamp": minPriceTimestamp,
        ".236": fib.twoThreeSix,
        ".382": fib.threeEightTwo,
        ".5": fib.five,
        ".618": fib.sixOneEight,
        ".702": fib.sevenZeroTwo,
        ".786": fib.sevenEightSix,
        "1": fib.one,
        "1.618": fib.onePointSixOneEight,
        "2.618": fib.twoPointSixOneEight,
        "3.618": fib.threePointSixOneEight,
        "4.236": fib.fourPointTwoThreeSix
    };
  
    return coinObj;
}

function calculateFib (maxPrice, minPrice) {
    const result = {
        "twoThreeSix": ((maxPrice - minPrice) * .236) + minPrice,
        "threeEightTwo": ((maxPrice - minPrice) * .382) + minPrice,
        "five": ((maxPrice - minPrice) * .5) + minPrice,
        "sixOneEight": ((maxPrice - minPrice) * .618) + minPrice,
        "sevenZeroTwo": ((maxPrice - minPrice) * .702) + minPrice,
        "sevenEightSix": ((maxPrice - minPrice) * .786) + minPrice,
        "one": ((maxPrice - minPrice) * 1) + minPrice,
        "onePointSixOneEight": ((maxPrice - minPrice) * 1.618) + minPrice,
        "twoPointSixOneEight": ((maxPrice - minPrice) * 2.618) + minPrice,
        "threePointSixOneEight": ((maxPrice - minPrice) * 3.618) + minPrice,
        "fourPointTwoThreeSix": ((maxPrice - minPrice) * 4.236) + minPrice
    };
    
    return result;
}

function createSortedStats (sort) {
    const length = sort.length;
    
    const stats = {
        "length": sort.length,
        "maxPrice": sort[0][1],
        "minPrice": sort[length -1][1],
        "maxPriceTimestamp": sort[0][0],
        "minPriceTimestamp": sort[length - 1][0]
    };
    
    return stats;
}


function createReducedSortedStats (sorted, maxPriceTimestamp) {
    const reduced = sorted.filter(function(item){ return item[0] >= maxPriceTimestamp });  
    const reducedLength = reduced.length;
    
    const stats = {
        "length": reduced.length,
        "maxPrice": reduced[0][1],
        "minPrice": reduced[reducedLength -1][1],
        "maxPriceTimestamp": reduced[0][0],
        "minPriceTimestamp": reduced[reducedLength - 1][0]
    };
    
    return stats;
}

