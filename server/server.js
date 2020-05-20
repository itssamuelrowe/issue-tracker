const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId;
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const issue = require('./issue.js');

const app = express();
app.use(express.static('static'));
app.use(cors());
app.use(bodyParser.json());

let db;
mongodb.MongoClient.connect('mongodb://localhost').then(client => {
	db = client.db('issuetracker');
	app.listen(3000, function() {
	    console.log('App started on port 3000.');
	});
}).catch(error => {
	console.log('Error: ', error);
})

app.get('/api/issues', (request, response) => {
	const filter = {};
	if (request.query.status) {
		filter.status = request.query.status;
	}
	
	if (request.query.effortLte || request.query.effortGte) {
		filter.effort = {};
	}
	if (request.query.effortLte) {
		filter.effort.$lte = parseInt(request.query.effortLte, 10);
	}
	if (request.query.effortGte) {
		filter.effort.$gte = parseInt(request.query.effortGte, 10);
	}

	db.collection('issues').find(filter).toArray().then(issues => {
		const metadata = {
			totalCount: issues.length
		};
		response.json({
			_metadata: metadata,
			records: issues
		});
	}).catch(error => {
		console.log(error);
		response.status(500).json({ message: error });
	})
});

app.post('/api/issues', (request, response) => {
	const newIssue = request.body;
	newIssue.created = new Date();

	if (!newIssue.status) {
		newIssue.status = 'New';
	}

	const error = issue.validateIssue(newIssue);
	if (error) {
		response.status(422).json({ message: error });
	}
	else {
		db.collection('issues').insertOne(newIssue).then(result =>
			db.collection('issues').findOne({
				_id: result.insertedId
			})).then(newIssue => response.json(newIssue)).catch(error => {
				console.log(error);
				response.status(500).json({ message: error });
			});
	}
});

app.get('/api/issues/:id', (request, response) => {
	let issueId;
	try {
		issueId = new ObjectId(request.params.id);

		db.collection('issues').find({ _id: issueId })
			.limit(1)
			.next()
			.then(issue => {
				if (!issue) {
					response.status(404).json({
						message: 'Cannot find an issue with the id ' + issueId
					});
				}
				else {
					response.json(issue);
				}
			})
			.catch(error => {
				console.log(error);
				response.status(500).json({
					message: error + ''
				});
			});
	}
	catch (error) {
		response.status(422).json({
			message: 'Invalid issue ID. ' + error
		});
	}
});