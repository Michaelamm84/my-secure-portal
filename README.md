React.js Application – Beginner-Friendly Guide
Overview


The above is our secure and final production of our project, and works online. If you would like to use our project locally please follow
the steps below: 

This guide will help you run the app locally from a zipped folder.

Prerequisites

Before starting, make sure you have:

Node.js installed (Download here
)

npm (comes with Node.js)

Visual Studio Code (or Visual Studio)

Step 1: Extract the Project

Locate the zipped folder you received.

Right-click the folder → Extract All → choose a location.

Open the extracted folder in Visual Studio Code (or Visual Studio).

Step 2: Install Dependencies

Open a terminal in Visual Studio Code (View → Terminal)

In the terminal, make sure you are in the project root folder.

Run the following command:

npm install

step 3: run the following command to link to SonarQube

sonar-scanner `
  -D"sonar.organization=michaelamm84" `
  -D"sonar.projectKey=Michaelamm84_my-secure-portal" `
  -D"sonar.host.url=https://sonarcloud.io" `
  -D"sonar.token=34ff8ce12b560e74a6da366205129f992209e75a" `
  -D"sonar.cfamily.compile-commands=./bw-output/compile-commands.json"


  step 4: run command sonar-scanner to run a test 


This will install all required packages listed in package.json.

Step 5: Start the Backend Server

In the terminal, navigate to the backend folder:

cd backend


Start the backend server:

npm start


Keep this terminal open while the backend server is running.

use login details for employy portal

employee1, password: SecurePass123!, account: EMP001`);
employee2, password: SecurePass456!, account: EMP002`);
employee3, password: SecurePass789!, account: EMP003`);



The app should open automatically in your browser at:

http://localhost:3000


Now you have both backend and frontend running locally.


sonarQube: Link https://sonarcloud.io/project/overview?id=Michaelamm84_my-secure-portal

Youtube: https://youtu.be/T5zI2b68sz8

github: https://github.com/Michaelamm84/my-secure-portal