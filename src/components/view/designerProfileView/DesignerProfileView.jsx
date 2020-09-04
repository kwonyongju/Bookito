import React, {useEffect, useState} from "react";
import { BrowserRouter } from "react-router-dom";
import { BackTop } from "antd";
import DesignerTop from "./designerTop/DesignerTop.jsx";
import DesignerBottom from "./designerBottom/DesignerBottom.jsx";
import { useSelector } from "react-redux";

const DesignerProfileView = () => {
  const designers = useSelector((state) => state.firestore.designers);
  const currentUser = useSelector((state) => state.signedInUser.signedInUser);
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const designerId = urlParams.get("uid");
  const found = designers.find((element) => element.uid === designerId);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (currentUser != null && currentUser.uid === found.uid) {
      setIsAuthenticated(true);
    }
  }, []);

  const {
    isAuthenticated,
    fname,
    lname,
    location,
    rate,
    photoURL,
    activity,
    bio,
    works,
    services,
    hours,
    reviews,
  } = found;

  return (
    <BrowserRouter>
      <div className="designerProfileView">
        <DesignerTop
          isAuthenticated={isAuthenticated}
          fname={fname}
          lname={lname}
          totalRate={rate}
          hours={hours}
          works={works}
          location={location}
          img={photoURL}
        />

        <DesignerBottom
          fname={fname}
          location={location}
          activity={activity}
          bio={bio}
          works={works}
          serviceNPrices={services}
          hours={hours}
          reviews={reviews}
        />

        <BackTop visibilityHeight={0}>
          <div className="backTopButton">Top</div>
        </BackTop>
      </div>
    </BrowserRouter>
  );
};

export default DesignerProfileView;
