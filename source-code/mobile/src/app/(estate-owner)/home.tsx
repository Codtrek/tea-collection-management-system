import { useState } from "react"
import { View, StyleSheet } from "react-native" 
import { Screen, StatCard, Header, EstateOwnerBottomTab, AppText } from "@/components/ui"
import { Hstack, Vstack } from "@/components/layout"
import { BottomTabItem } from "@/components/ui/BottomTab";



export default function EstateOwnerHome() {
    const [activeTab, setActiveTab] = useState("Home");
    const handleTabPress = (tab: BottomTabItem) => {
        setActiveTab(tab.key);
        
        // Later you can navigate here if needed
        // router.push(...)
    };
    return(
        <>
            <Screen style={styles.container}>
                <View style={styles.content}>
                    <Header companyName="Radeesh"/>
                    <StatCard title="CURRENT MONTH COLLECTION" value1="12398 kg" value2="Rs. 345,045,690" variant="primary" width="full"/>
                    

                        <StatCard title="Today's Plucking" value2="23,345 kg" variant="surface" width="half"/>
                        <StatCard title="Today's Collection" value2="Rs. 345,690" variant="surface" width="half"/>
                    
                    <AppText variant="subheading">Quick Actions</AppText>
                    
                </View>

                <EstateOwnerBottomTab activeTab={activeTab} onTabPress={handleTabPress} style={styles.bottomTab}/>
            </Screen>
        </>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: "100%",
    },
    content: {
        flex: 1,
        width: "100%",
    },

    bottomTab:{
        width: "100%",
        marginTop: 20,
        alignSelf: "stretch",
    }
})
