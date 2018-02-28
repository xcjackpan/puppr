import React from 'react';
import axios from 'axios';
import Masonry from 'react-masonry-component';
import { db, auth, firebase } from '../configs';
import ImageComponent from '../components/ImageComponent';
import PreviewComponent from '../components/PreviewComponent';

export default class BoardContainer extends React.Component {

  constructor(props) {
      super(props);
      this.state = {
          gallery: [],
          favourites: [],
          uploaded: [],
          upvoted: [],
          previewOpen: false,
          visibilityFilter: 'ALL',
      }
  }
  componentDidMount() {
    console.log("BoardContainer has mounted.");
    //Check if new child added
    db.getRefOfImages().on('child_added', data => {
      console.log("Adding child: " + data.key);
      let tempGal = this.state.gallery;
      let tempUp = this.state.uploaded;
      tempGal[data.key] = data.val();
      if (this.props.authUser) tempUp[data.key] = data.key;
      else tempUp = [];
      this.setState({
        gallery: tempGal,
        uploaded: tempUp
      });
    });
    console.log("AuthUser: " + this.props.authUser);
  }
  componentWillReceiveProps(newProps) {
    console.log("Receiving new props");
    if (newProps.authUser) {
      this.setState({
        favourites: newProps.user.favourites? newProps.user.favourites: [],
        uploaded: newProps.user.uploaded? newProps.user.uploaded: [],
        upvoted: newProps.user.upvoted? newProps.user.upvoted: [],
      });
    }
    else {
      this.setState({
        favourites: [],
        uploaded: [],
        upvoted: []
      })
    }
  }
  changeDimension = (height, width) => {
    height *= 300/width;
    width = 300;
    return {height:height, width:width}
  }
  handleFavourite = (e) => {
    console.log("Handling favourite");
    if (this.props.authUser) {
      if (!this.state.favourites[e.target.dataset.id]) {
        let tempFav = this.state.favourites?this.state.favourites:[];
        tempFav[e.target.dataset.id] = e.target.dataset.id;
        this.setState({
          favourites: tempFav
        });
        db.addFavouriteToUser(this.props.authUser.uid, e.target.dataset.id);
      }
      else {
        let tempFav = this.state.favourites;
        delete tempFav[e.target.dataset.id];
        this.setState({
          favourites: tempFav
        });
        db.destroyFavouriteFromUser(this.props.authUser.uid, e.target.dataset.id);
      }
    }
  }
  handleDelete = (e) => {
    console.log("Deleting Image");
    if (this.props.authUser) {
      let tempUp = this.state.uploaded;
      delete tempUp[e.target.dataset.id];
      let tempGal = this.state.gallery;
      delete tempGal[e.target.dataset.id];
      let tempFav = this.state.favourites;
      delete tempFav[e.target.dataset.id];
      db.destroyUpvote(this.props.authUser.uid, e.target.dataset.id);
      this.setState({
        uploaded: tempUp,
        gallery: tempGal,
        favourites: tempFav
      });
      db.destroyImage(this.props.authUser.uid, e.target.dataset.id);
    }
  }
  handleVote = (e) => {
    console.log("Voting for " + e.target.dataset.id);
    if (this.props.authUser) {
      if (!this.state.upvoted[e.target.dataset.id]) {
        let tempGal = this.state.gallery;
        tempGal[e.target.dataset.id].upvote += 1;
        let tempUpv = this.state.upvoted;
        tempUpv[e.target.dataset.id] = e.target.dataset.id;
        this.setState({
          gallery: tempGal,
          upvoted: tempUpv,
        });
        db.upvoteImage(this.props.authUser.uid, e.target.dataset.id);
      }
      else {
        let tempGal = this.state.gallery;
        Object.values("Temporary Gallery values: " + tempGal[e.target.dataset.id])
        tempGal[e.target.dataset.id].upvote -= 1;
        let tempUpv = this.state.upvoted;
        delete tempUpv[e.target.dataset.id];
        this.setState({
          gallery: tempGal,
          upvoted: tempUpv,
        });
        console.log("Removing pat of: " + e.target.dataset.id);
        db.downvoteImage(e.target.dataset.id);
        db.destroyUpvote(this.props.authUser.uid, e.target.dataset.id);
      }
    }
  }
  clickImage = (e) => {
    console.log("Clicking image");
    if (!this.state.previewOpen) {
      this.setState({ previewOpen: {url: e.target.dataset.id, width: e.target.dataset.width, height: e.target.dataset.height} });
    } else {
      this.setState({ previewOpen: false });
    }
  }
  showVisibilityFilter = (visibilityFilter) => {
    console.log("Handling visibility filter");
    switch (visibilityFilter) {
      case 'ALL':
        return Object.values(this.state.gallery);
      case 'FAVOURITES':
        return Object.values(this.state.gallery).filter(id => {
          let public_id = id.public_id;
          return Object.keys(this.state.favourites).includes(public_id);
      });
      case 'YOUR UPLOADS':
        return Object.values(this.state.gallery).filter(id => {
          let public_id = id.public_id;
          return Object.keys(this.state.uploaded).includes(public_id);
      });
      case 'PATS':
        return Object.values(this.state.gallery).sort((a, b) => {
          return b.upvote - a.upvote;
        });
      default:
        return Object.values(this.state.gallery);
    }
  }
  handleVisibilityFilter = (e) => {
    this.setState({
      visibilityFilter: e.target.dataset.id
    })
  }
  render() {
    // TODO add unheart button - Done
    // TODO add delete button to uploads - Done
    // TODO handle votes (same system as favourites)
    console.log("Favourites: " + Object.keys(this.state.favourites));
    console.log("Uploaded: " + Object.keys(this.state.uploaded));
    console.log("Upvoted: " + Object.keys(this.state.upvoted));
    console.log("Gallery: " + Object.keys(this.state.gallery));
    let visibleImages = this.showVisibilityFilter(this.state.visibilityFilter);
    console.log(visibleImages);
    if (!this.state.previewOpen) {
        return (
            <div>
              { this.props.authUser
                ? <div className="visibilityFilterHolder">
                    <button className="visibilityFilterButtons" onClick={this.handleVisibilityFilter} data-id='ALL'> home </button>
                    <button className="visibilityFilterButtons" onClick={this.handleVisibilityFilter} data-id='FAVOURITES'> favourites </button>
                    <button className="visibilityFilterButtons" onClick={this.handleVisibilityFilter} data-id='YOUR UPLOADS'> uploads </button>
                    <button className="visibilityFilterButtons" onClick={this.handleVisibilityFilter} data-id='PATS'> likes </button>
                  </div>
                : <div className="visibilityFilterHolder">
                    <button className="visibilityFilterButtons" onClick={this.handleVisibilityFilter} data-id='ALL'> home </button>
                    <button className="visibilityFilterButtons" onClick={this.handleVisibilityFilter} data-id='PATS'> likes </button>
                  </div>

              }
              <Masonry>
              {visibleImages.map(data =>
                <ImageComponent
                  src={'http://res.cloudinary.com/dl2zhlvci/image/upload/v1519264049/' + data.public_id + '.jpg'}
                  dimension={this.changeDimension(data.height, data.width)}
                  dbDimension={{width: data.width, height:data.height}}
                  disabled={!this.props.authUser}
                  unheart={Object.keys(this.state.favourites).includes(data.public_id)}
                  delete={Object.keys(this.state.uploaded).includes(data.public_id)}
                  patted={Object.keys(this.state.upvoted).includes(data.public_id)}
                  upvotes={data.upvote}
                  handleDelete={this.handleDelete}
                  key={data.public_id}
                  public_id={data.public_id}
                  handleFavourite={this.handleFavourite}
                  handleVote={this.handleVote}
                  openPreview={this.clickImage}
                />
              )}
            </Masonry>
          </div>
        );
    } else {
      return (
        <div style={{display:'flex', flexWrap:'wrap'}}>
          <PreviewComponent
            src={'http://res.cloudinary.com/dl2zhlvci/image/upload/v1519264049/' + this.state.previewOpen.url + '.jpg'}
            dbDimension={{width: this.state.previewOpen.width, height: this.state.previewOpen.height}}
            handleClick={this.clickImage} />
          <button onClick={this.clickImage}> X </button>
        </div>
      );
    }
  }
}
