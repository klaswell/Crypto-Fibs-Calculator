var myHeaders = new Headers();  // Currently empty
myHeaders.append('Access-Control-Allow-Origin', '*');  // Of CORS

cryptoForm.addEventListener('submit', async function (e) {
	e.preventDefault();  // Prevents reload of page
	$("#errors").empty();  // Empties errors div
	$("#success").empty();  // Empties success div


	const formData = new FormData(this);
	const coin = formData.get('coin').toLowerCase();
	const vsCurrency = formData.get('vsCurrency').toLowerCase();
	const from = formData.get('from');
	const to = formData.get('to');

	console.log("Form with info: " + coin + ", " + vsCurrency + ", " + from + ", "  + to);
			

	if (validateCoin(coin) && validateVsCurrency(vsCurrency)) {
		$("#success").text('Loading'); // Display "Loading" above form
	
		
		formData.set('coin', coin);  // Replace 'coin' in formData with lowercase 
		formData.set('vsCurrency', vsCurrency);  // Replace 'vsCurrency' in formData with lowercase
		
		if (from) {  // If 'from' was provided in form input
			let fromDate = new Date(from);
			let fromEpoch = fromDate.getTime()/1000.0;  // Convert human-readable input to unix epoch
			formData.set('from', fromEpoch);  // Replace or set 'from' in formData
		}
		if (to) {  // If 'to' was provided in form input
			let toDate = new Date(to);  // Your timezone!
			let toEpoch = toDate.getTime()/1000.0;  // Convert human-readable input to unix epoch
			formData.set('to', toEpoch);  // Replace or set 'to' in formData
		}
		
		
		// Send request to Lambda
		let coinObj = await fetch('https://qkelmclzlj.execute-api.us-east-2.amazonaws.com/prod/fib', {
			method: 'POST',
			body: JSON.stringify(Object.fromEntries(formData)),
			headers: {
				'Content-Type': 'application/json'
			},
			
		}).then((response) => {
			$("#success").text('');  // Resets previous message
			
			console.log(response.status);
			
			if (response.status >= 200 && response.status <= 299) {
				return response;
			}
			else if (response.status == 500) {
				$("#errors").text("There was an error getting info from the database");
				throw 500;
			}
			else if (response.status == 422) {
				$("#errors").text("There's something wrong with the parameters you provided");
				throw 422;
			}
			else throw 500;
			
		}).then((response) => {
			console.log("Success!");
	        $("#success").text("Fibonacci numbers loaded!");
			return response;
			
		}).then((response) => {  // Transform response to JSON obj
			return response.json();
			
		}).then((response) => {
			
			const minPrice = response["minPrice"];
			const p236 = response[".236"];
			const p382 = response[".382"];
			const p5 =  response[".5"];
			const p618 = response[".618"];
			const p702 = response[".702"];
			const p786 = response[".786"];
			const one = response["1"];
			const oneP618 = response["1.618"];
			const twoP618 = response["2.618"];
			const threeP618 = response["3.618"];
			const fourP236 = response["4.236"];
			
			let maxPriceDate = new Date(response["maxPriceTimestamp"]);  // Convert unix epoch to human-readable
			let minPriceDate = new Date(response["minPriceTimestamp"]);  // ^
			
			// Update results on page
			$("#resultsCoin").text(response["coin"].toUpperCase());
			$("#resultsVsCurrency").text(response.vsCurrency.toUpperCase());
			$("#maxPrice").text(response["maxPrice"].toPrecision(8));
			$("#maxPriceTimestamp").text(maxPriceDate.toLocaleString());
			$("#minPrice").text(minPrice.toPrecision(8));
			$("#minPriceTimestamp").text(minPriceDate.toLocaleString());
			
			$("#p236").text(p236.toPrecision(8) + "  " + calcPerc(minPrice, p236));
			$("#p382").text(p382.toPrecision(8) + "  " + calcPerc(minPrice, p382));
			$("#p5").text(p5.toPrecision(8) + "  " + calcPerc(minPrice, p5));
			$("#p618").text(p618.toPrecision(8) + "  " + calcPerc(minPrice, p618));
			$("#p702").text(p702.toPrecision(8) + "  " + calcPerc(minPrice, p702));
			$("#p786").text(p786.toPrecision(8) + "  " + calcPerc(minPrice, p786));
			$("#1").text(one.toPrecision(8) + "  " + calcPerc(minPrice, one));
			$("#1p618").text(oneP618.toPrecision(8) + "  " + calcPerc(minPrice, oneP618));
			$("#2p618").text(twoP618.toPrecision(8) + "  " + calcPerc(minPrice, twoP618));
			$("#3p618").text(threeP618.toPrecision(8) + "  " + calcPerc(minPrice, threeP618));
			$("#4p236").text(fourP236.toPrecision(8)+ "  " + calcPerc(minPrice, fourP236));
			
		}).catch((responseStatus) => {
			console.log(responseStatus + " - Error");
			
			if (responseStatus == 422) {
			//	$("#errors").text("There was an error getting info from the database");
			}
			else if (responseStatus == 500) {
			//	$("#errors").text("There was an error getting info from the database");
			}
			else {
				$("#errors").text('Something went wrong, please try again');
			}
		})
	}
	else {
		console.log("error");
		$("#errors").text("There's something wrong with the parameters you provided");
	}

});


function calcPerc(denominator, numerator) {
	let result = numerator/denominator;
	let rounded = Math.round((result + Number.EPSILON) * 100);

	return ( "(" + rounded + "%)" );
}

function validateCoin(coin) {
	let letters = /^[A-Za-z-]+$/;

	if (coin.match(letters) ) {
		return true;
	}
	else {
		form.coin.setCustomValidity('Coin must have alphabet characters (and possibly dashes) only');
		form.coin.focus();
		form.reportValidity();
		return false;
	}
}

function validateVsCurrency(vsCurrency) {
	let letters = /^[A-Za-z]+$/;
	
	if (vsCurrency.match(letters)) {
		return true;
	}
	else if (vsCurrency == "") {
		return true;
	}
	else {
		form.vsCurrency.setCustomValidity("Please enter a valid vs currency");
		form.vsCurrency.focus();
		form.reportValidity();
		return false;
	}
}

/*
function validateTo(form) {
	let to	= form.to.value.toLowerCase();
	let letters = /^[A-Za-z]+$/;
	
	if (to.match(letters)) {
		return true;
	}
	else if (to == "") {
		return true;
	}
	else {
		form.to.setCustomValidity("Please enter a valid to time");
		form.to.focus();
		form.reportValidity();
		return false;
	}
}

function validateFrom(form) {
	let from = form.from.value.toLowerCase();
	let letters = /^[A-Za-z]+$/;
	
	if (from.match(letters)) {
		return true;
	}
	else if (from == "") {
		return true;
	}
	else {
		form.from.setCustomValidity("Please enter a valid from time");
		form.from.focus();
		form.reportValidity();
		return false;
	}
}
*/
