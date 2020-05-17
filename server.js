const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(express.static('static'));
app.use(cors());
app.use(bodyParser.json());

const issues = [
  {
    id: 1,
    status: 'Open',
    owner: 'Ravan',
    created: new Date('2016-08-15'),
    effort: 5,
    completionDate: undefined,
    title: 'Error in console when clicking Add',
  },
  {
    id: 2,
    status: 'Assigned',
    owner: 'Eddie',
    created: new Date('2016-08-16'),
    effort: 14,
    completionDate: new Date('2016-09-30'),
    title: 'Missing bottom border on panel',
  },
  {
    id: 3,
    status: 'Assigned',
    owner: 'Samuel',
    created: new Date('2016-08-16'),
    effort: 14,
    completionDate: new Date('2016-09-30'),
    title: 'Missing top border on panel',
  },
];

app.get('/api/issues', (request, response) => {
	const metadata = {
		total_count: issues.length
	};
	response.json({
		_metadata: metadata,
		records: issues
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
	id: 'required',
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
	newIssue.id = issues.length + 1;
	newIssue.created = new Date();

	if (!newIssue.status) {
		newIssue.status = 'New';
	}

	const error = validateIssue(newIssue);
	if (error) {
		response.status(422).json({ message: error });
	}
	else {
		issues.push(newIssue);
		response.json(newIssue);
	}
});

app.listen(3000, function() {
    console.log('App started on port 3000.');
})