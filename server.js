const mongodb = require('mongodb');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

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
	db.collection('issues').find().toArray().then(issues => {
		const metadata = {
			total_count: issues.length
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

const validIssueStatus = {
	New: true,
	Open: true,
	Assigned: true,
	Fixed: true,
	Verified: true,
	Closed: true,
};

const issueFieldType = {
	status: 'required',
	owner: 'required',
	effort: 'optional',
	created: 'required',
	completionDate: 'optional',
	title: 'required'
};

function validateIssue(issue) {
	for (const field in issueFieldType) {
		const type = issueFieldType[field];
    	if (!type) {
     	 	delete issue[field];
		}
		else if (type === 'required' && !issue[field]) {
      		return `${field} is required.`;
    	}
  	}
  	if (!validIssueStatus[issue.status]) {
    	return `${issue.status} is not a valid status.`;
    }
  	return null;
}

app.post('/api/issues', (request, response) => {
	const newIssue = request.body;
	newIssue.created = new Date();

	if (!newIssue.status) {
		newIssue.status = 'New';
	}

	const error = validateIssue(newIssue);
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