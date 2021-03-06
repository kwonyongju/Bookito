import React, { useState, useEffect } from "react";
import { Button, Drawer, Spin } from "antd";
import queryString from "query-string";
import { load_database } from "../../../actions/firebaseAction";
import { firebaseStore } from "../../../config/fbConfig";
import { useDispatch, useSelector } from "react-redux";
import DesignerCardComponent from "./designerCardComponent/DesignerCardComponent";
import DesignerListFilter from "./DesignerListFilter";
import Map from "../../commonComponents/map/Map";
import { CloseOutlined } from "@ant-design/icons";
import { useHistory } from "react-router-dom";
import { designerTags } from "../../../constants/designerTags";
import { geocode } from "../../../helpers/geocode";
import { getDistanceFromLatLonInKm } from "../../../helpers/geocode";
import InfiniteScroll from "react-infinite-scroll-component";
import MainSearchBar from "../../commonComponents/mainSearchBar/MainSearchBar";

export default function DesignerListView(props) {
  // window.location.reload();

  const designerState = useSelector((state) => state.firestore.designers);
  const [designers, setDesigners] = useState(designerState);

  const dispatch = useDispatch();
  const history = useHistory();

  const defaultInitialDisplayCount = 10;
  const defaultBookitoWidth = "1300px";
  const defaultDesignerListingWidth = "96%";

  let lastScrollTop = 0;
  const [hideFilterBar, setHideFilterBar] = useState(false);

  // User location variables
  const [userLocation, setUserLocation] = useState();
  const [defaultLocation] = useState({ lat: 34.0522, lng: 118.2437 });
  const locationAddress = queryString.parse(props.location.search)["location"];
  const designerType = queryString.parse(props.location.search)["type"];

  const [loadingDesigners, setLoadingDesigners] = useState(false);
  const [designersCurrent, setDesignersCurrent] = useState([...designers]);
  const [designersCurrentDisplayed, setDesignersCurrentDisplayed] = useState(
    designersCurrent.slice(0, defaultInitialDisplayCount)
  );

  const [mapVisibleMobile, setMapVisibleMobile] = useState(false);
  const [mapVisibleDesktop, setMapVisibleDesktop] = useState(true);
  const [filterTags, setFilterTags] = useState(designerTags[designerType]);
  const [filterCheckedTags, setFilterCheckedTags] = useState(designerTags[designerType]);
  const [filterDate, setFilterDate] = useState(null);
  const [sortBy, setSortBy] = useState("");

  useEffect(() => {
    setLoadingDesigners(true); // Start loading spin animation
    firebaseStore
      .collection("users")
      .where("accountType", "==", designerType)
      .get()
      .then((querySnapshot) => {
        const newDesigners = [];
        querySnapshot.docs.forEach((doc) => {
          newDesigners.push(doc.data());
        });
        dispatch(load_database(newDesigners));
        (async () => {
          await refreshSearchResults(newDesigners);
          setLoadingDesigners(false); // End loading spin animation
        })();
      }, []);

    // This section of code is used to control the filter hiding and appearing on scrolling down and up respectively.
    if (window.innerWidth >= 1200) {
      // Mixin.scss desktop
      document.getElementsByTagName("body")[0].style.width = defaultDesignerListingWidth;
      document.getElementsByTagName("body")[0].style.padding = 0;
    }
    document
      .getElementById("scrollableDiv")
      .addEventListener("scroll", handleFilterDisplayOnScroll, { passive: true });
    return () => {
      if (window.innerWidth >= 1200) {
        // Mixin.scss desktop
        document.getElementsByTagName("body")[0].style.width = defaultBookitoWidth;
      }
      document
        .getElementById("scrollableDiv")
        .removeEventListener("scroll", handleFilterDisplayOnScroll);
    };
  }, [dispatch, props.location.search]);

  const getAndSetUserLocation = async () => {
    const userLatLng = await geocode(props.location.search);
    if (userLatLng) {
      setUserLocation(userLatLng);
    } else {
      setUserLocation(defaultLocation);
      console.log("Unable to get location!");
    }
    return userLatLng;
  };

  const assignDistanceToDesigners = async (designers, userLatLng) => {
    // Calculate and set distance of designers from user location
    if (!userLatLng) {
      return;
    }
    designers.forEach((designer) => {
      if (designer.latLng) {
        designer.distance = getDistanceFromLatLonInKm(
          designer.latLng.lat,
          designer.latLng.lng,
          userLatLng.lat,
          userLatLng.lng
        );
      }
    });
  };

  const refreshSearchResults = async (newDesigners) => {
    let userLatLng = await getAndSetUserLocation();
    assignDistanceToDesigners(newDesigners, userLatLng);
    setDesigners(newDesigners);
    setDesignersCurrent(newDesigners);
    setDesignersCurrentDisplayed(newDesigners);
  };

  const handleSearch = (designer) => {
    const route = `/designer_profile/${designer.uid}`;
    history.push(route);
  };

  const updateSortBy = async (sortByKey) => {
    // play faux loading animation and delay
    await displayLoadingAnimation();

    let sortedDesigners = [...designersCurrent];
    setSortBy(sortByKey);

    switch (sortByKey) {
      case "distance":
        sortedDesigners.sort((a, b) => {
          if (a.distance && b.distance) {
            return a.distance - b.distance;
          } else if (a.distance) {
            return -1;
          } else {
            return 1;
          }
        });
        break;
      case "reviewScore":
        sortedDesigners.sort((a, b) => {
          if (a.rate.average && b.rate.average) {
            return b.rate.average - a.rate.average;
          } else if (b.rate.average) {
            return -1;
          } else {
            return 1;
          }
        });
        break;
      case "reviewCount":
        sortedDesigners.sort((a, b) => {
          if (a.rate.count && b.rate.count) {
            return b.rate.count - a.rate.count;
          } else if (b.rate.count) {
            return -1;
          } else {
            return 1;
          }
        });
        break;
      case "new":
        sortedDesigners.sort((a, b) => {
          return a.createdOn - b.createdOn;
        });
        break;
      default:
        break;
    }
    setDesignersCurrent(sortedDesigners);
    setDesignersCurrentDisplayed(sortedDesigners.slice(0, defaultInitialDisplayCount));
  };

  const updateFilter = (checkedTags = filterCheckedTags, date = filterDate) => {
    let filteredDesigners = [...designers];

    // Filter by Tags
    setFilterCheckedTags(checkedTags);
    if (checkedTags && checkedTags.length > 0) {
      filteredDesigners = filteredDesigners.filter((designer) =>
        Object.keys(designer.services).some((service) => checkedTags.includes(service))
      );
    }
    // Filter by Date
    setFilterDate(date);
    if (date) {
      const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
      filteredDesigners = filteredDesigners.filter(
        (designer) => designer.hours[dayOfWeek] && !designer.hours[dayOfWeek][0].closed
      );
    }

    // Apply all filter
    setDesignersCurrent(filteredDesigners);

    // Reapply sort byc
    updateSortBy(sortBy);
  };

  const displayMoreResults = () => {
    setDesignersCurrentDisplayed(designersCurrent.slice(0, ++designersCurrentDisplayed.length));
  };

  const handleFilterDisplayOnScroll = () => {
    if (window.innerWidth < 1200) {
      // Screen size less than desktop
      let scrollTop = window.pageYOffset || document.getElementById("scrollableDiv").scrollTop;
      setHideFilterBar(scrollTop > lastScrollTop);
      lastScrollTop = scrollTop;
    }
  };

  const displayLoadingAnimation = () => {
    const loadTimeMin = 250;
    const loadTimeMax = 350;
    return new Promise((resolve) => {
      setLoadingDesigners(true);
      setTimeout(() => {
        setLoadingDesigners(false);
        resolve();
      }, Math.random() * (loadTimeMax - loadTimeMin) + loadTimeMin);
    });
  };

  // Desktop map controls
  const openMapDesktop = () => {
    setMapVisibleDesktop(true);
    document.getElementsByTagName("body")[0].style.width = defaultDesignerListingWidth;
  };
  const closeMapDesktop = () => {
    setMapVisibleDesktop(false);
    document.getElementsByTagName("body")[0].style.width = defaultBookitoWidth;
  };

  // Mobile map controls
  const openMapMobile = () => {
    setMapVisibleMobile(true);
  };
  const closeMapMobile = () => {
    setMapVisibleMobile(false);
  };

  return (
    <section className="listingContainer">
      <MainSearchBar
        defaultDesignerType={designerType}
        defaultAddress={locationAddress}
        disableMovement={true}
      />
      {/* Designer listing shrinks using the class "designerContainerMapVisible" when map is open on desktop */}
      <div
        className={
          mapVisibleDesktop ? "designerContainerMapVisible designerContainer" : "designerContainer"
        }
      >
        <div className="listingBase" id="scrollableDiv">
          {/* Controls above the designer listing */}
          <div className="listNavBar">
            <div
              className={mapVisibleDesktop ? "filter desktopMapOpenWidthFilter" : "filter"}
              style={hideFilterBar ? { top: -40 } : {}}
            >
              <DesignerListFilter
                filterTags={filterTags}
                updateFilter={updateFilter}
                numberOfDesigners={Object.keys(designersCurrent).length}
                location={locationAddress}
                updateSortBy={updateSortBy}
                openMapDesktop={mapVisibleDesktop ? null : openMapDesktop}
              />
            </div>
            {/* Mobile map toggle button - used to open map drawer */}
            <Button
              className="mobileOnly designerListOpenMapMobile"
              onClick={openMapMobile}
              style={hideFilterBar ? { bottom: -40, visible: "hidden" } : {}}
            >
              {" "}
              {/*shape="circle"*/}
              <span role="img" aria-label="map">
                🗺️ Map
              </span>
            </Button>
          </div>
          {/* Designer listing */}
          <InfiniteScroll
            className={mapVisibleDesktop ? "desktopMapOpenWidthListing" : ""}
            scrollableTarget="listingBase"
            dataLength={designersCurrentDisplayed.length}
            next={displayMoreResults}
            hasMore={true}
            loader={<></>}
            scrollableTarget="scrollableDiv"
          >
            <Spin spinning={loadingDesigners} size="large">
              {/* console.log(designers) || */}
              {designersCurrentDisplayed.map((designer, index) => {
                if (designer !== undefined) {
                  return (
                    <div key={index} className="designerList">
                      <DesignerCardComponent
                        designer={designer}
                        handleSearch={handleSearch}
                        mapVisibleDesktop={mapVisibleDesktop}
                      />
                    </div>
                  );
                }
              })}
            </Spin>
          </InfiniteScroll>
        </div>

        <Drawer
          className="mobileOnly"
          // placement="bottom"
          closable={false}
          onClose={closeMapMobile}
          visible={mapVisibleMobile}
          getContainer={false}
        >
          {/* Map close button (top left of the map) */}
          <Button
            className="mapCloseButton mobileOnly"
            type="primary"
            shape="circle"
            onClick={closeMapMobile}
          >
            <CloseOutlined />
          </Button>
          {/* Map inside drawer */}
          <div className="mapContainer">
            <Map
              isDesktop={false}
              userLocation={userLocation}
              designers={Object.values(designersCurrent)}
            />
          </div>
        </Drawer>
      </div>

      {mapVisibleDesktop && (
        <div className="mapBase desktopOnly">
          {/* Map close button (top left of the map) */}
          <Button
            className="mapCloseButton desktopOnly"
            type="primary"
            shape="circle"
            onClick={closeMapDesktop}
          >
            <CloseOutlined />
          </Button>
          {/* Map on the right of designer list view */}
          <div className="mapContainer">
            <Map
              isDesktop={true}
              userLocation={userLocation}
              designers={Object.values(designersCurrent)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
