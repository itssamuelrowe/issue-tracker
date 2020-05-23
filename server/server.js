const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId;
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Issue = require('./issue.js');

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

	if (request.query.summary === undefined) {
		const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;
		let limit = request.query.limit? parseInt(request.query.limit, 10) : 10;
		if (limit > 50) {
			limit = 50;
		}
		const cursor = db.collection('issues')
			.find(filter)
			.sort({ _id: 1 })
			.skip(offset)
			.limit(limit);

		let totalCount;
		cursor.count(false).then(result => {
			totalCount = result;
			return cursor.toArray();
		})
		.then(issues => {
			response.json({
				_metadata: { totalCount },
				records: issues
			});
		}).catch(error => {
			console.log(error);
			response.status(500).json({ message: error });
		});
	}
	else {
		db.collection('issues').aggregate([
			{
				$match: filter
			},
			{
				$group: {
					_id: {
						owner: '$owner',
						status: '$status'
					},
					count: {
						$sum: 1
					}
				}
			}
		]).toArray()
		.then(results => {
			const stats = {};
			results.forEach(result => {
				if (!stats[result._id.owner]) {
					stats[result._id.owner] = {};
				}
				stats[result._id.owner][result._id.status] = result.count;
			});
			response.json(stats);
		})
		.catch(error => {
			console.log(error);
			response.status(500).json({
				message: error + ''
			});
		})
	}
});

app.post('/api/issues', (request, response) => {
	const newIssue = request.body;
	newIssue.created = new Date();

	if (!newIssue.status) {
		newIssue.status = 'New';
	}

	const error = Issue.validateIssue(newIssue);
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

app.put('/api/issues/:id', (request, response) => {
	let issueId;
	try {
		issueId = new ObjectId(request.params.id);

		const issue = request.body;
		delete issue._id;

		const error = Issue.validateIssue(issue);
		if (error) {
			response.status(422).json({ message: error + '' });
		}
		else {
			db.collection('issues').update({ _id: issueId },
				Issue.convertIssue(issue))
				.then(() => db.collection('issues')
					.find({ _id: issueId })
					.limit(1)
					.next())
				.then(savedIssue => response.json(savedIssue))
				.catch(error => {
					console.log(error);
					response.status(500).json({
						message: error + ''
					});
				});
		}
	}
	catch (error) {
		response.error(422).json({
			message: error + ''
		});
	}
})

app.delete('/api/issues/:id', (request, response) => {
	let issueId;
	try {
		issueId = new ObjectId(request.params.id);
		db.collection('issues').deleteOne({
			_id: issueId
		}).then(result => {
			if (result.result.n === 1) {
				response.json({
					status: 'OK'
				});
			}
			else {
				response.json({
					status: 'Warning: The specified object could not be found.'
				})
			}
		})
		.catch(error => {
			console.log(error);
			response.response(500).json({
				message: 'Error: ' + error
			});
		})
	}
	catch (error) {
		response.status(422).json({
			message: 'The specified ID is invalid. ' + error
		})
	}
})