import React from 'react';
import CssBaseline from '@material-ui/core/CssBaseline';
import Box from '@material-ui/core/Box';
import {BrowserRouter as Router, Switch, Route, Redirect,  } from 'react-router-dom';
import { HistoryPage } from './containers/historyPage';
import { StreamPage } from './containers/streamPage';

function App() {
  return (
    <Router>
      <React.Fragment>
      <CssBaseline />
      <Box m="auto" component="div" style={{ backgroundColor: '#51d0d4', minHeight: '100vh', width:'100vw'}}>
          <Switch>
            <Route path="/" exact render={(match) => <Redirect to="/stream"/>}/>
            <Route path="/stream" exact component={StreamPage} />
            <Route path="/history" exact component={HistoryPage} />
          </Switch>
      </Box>
      </React.Fragment>
    </Router>
  );
}

export default App;
