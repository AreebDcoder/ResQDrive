import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import api from '../api/axios';


import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HospitalsScreen from '../screens/HospitalsScreen';

const Stack = createStackNavigator();

// Simple Placeholder homepages for Driver and Mechanic
function DriverHome({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Portal</Text>
      <Text style={styles.subtitle}>Smart Accident Detection & Alerts Active 🛡️</Text>
      <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Profile')}>
        <Text style={styles.navBtnText}>Go to Profile</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Hospitals')}>
        <Text style={styles.navBtnText}>🏥 Nearest Hospitals</Text>
      </TouchableOpacity>
    </View>
  );
}

function MechanicHome({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mechanic Workshop Dashboard</Text>
      <Text style={styles.subtitle}>Receive roadside rescue referrals here 🔧</Text>
      <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Profile')}>
        <Text style={styles.navBtnText}>Go to Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

function AdminHome({ navigation }: any) {
  const [pendingMechanics, setPendingMechanics] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const fetchPendingMechanics = React.useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      // Get all mechanics from the admin endpoint
      const response = await api.get('/admin/users?role=MECHANIC');
      // Filter for those whose workshops are not verified yet
      const unverified = response.data.users.filter(
        (u: any) => u.mechanicDetails && u.mechanicDetails.isWorkshopVerified === false
      );
      setPendingMechanics(unverified);
    } catch (err: any) {
      console.log('Failed to fetch pending mechanics:', err);
      setMessage('Failed to load pending approvals list.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPendingMechanics();
  }, [fetchPendingMechanics]);

  const handleApprove = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/verify-workshop`, {
        isWorkshopVerified: true,
      });
      // Remove approved mechanic from local list state
      setPendingMechanics((prev) => prev.filter((m) => m.id !== userId));
    } catch (err) {
      alert('Failed to approve workshop.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Admin Audit Portal</Text>
        <Text style={styles.subtitle}>Manage platform settings & verify workshops 🛡️</Text>
      </View>

      <Text style={styles.sectionTitle}>Pending Workshop Approvals ({pendingMechanics.length})</Text>

      {isLoading ? (
        <ActivityIndicator color="#d32f2f" size="large" style={{ marginTop: 20 }} />
      ) : message ? (
        <Text style={styles.errorText}>{message}</Text>
      ) : pendingMechanics.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🎉 All workshops are currently verified!</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollList}>
          {pendingMechanics.map((mechanic) => (
            <View key={mechanic.id} style={styles.approvalCard}>
              <View style={styles.cardRow}>
                <Text style={styles.mechanicName}>{mechanic.fullName}</Text>
                <Text style={styles.specializationBadge}>
                  {mechanic.mechanicDetails?.specialization}
                </Text>
              </View>
              <Text style={styles.cardInfo}>Email: {mechanic.email}</Text>
              <Text style={styles.cardInfo}>Phone: {mechanic.phoneNumber}</Text>
              <Text style={styles.cardInfo}>
                Workshop: <Text style={{ fontWeight: 'bold', color: '#ffffff' }}>{mechanic.mechanicDetails?.workshopName}</Text>
              </Text>
              <Text style={styles.cardInfo}>Address: {mechanic.mechanicDetails?.workshopAddress}</Text>

              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => handleApprove(mechanic.id)}
              >
                <Text style={styles.approveBtnText}>Approve & Verify Workshop</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Profile')}>
        <Text style={styles.navBtnText}>Go to My Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#121212', elevation: 0, shadowOpacity: 0 },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
        cardStyle: { backgroundColor: '#121212' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} options={{ title: 'Email Verification' }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Forgot Password' }} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Reset Password' }} />
    </Stack.Navigator>
  );
}

function AppStack({ role }: { role: string }) {
  const getHomeComponent = () => {
    switch (role) {
      case 'DRIVER':
        return DriverHome;
      case 'MECHANIC':
        return MechanicHome;
      case 'ADMIN':
        return AdminHome;
      default:
        return DriverHome;
    }
  };

  const getHeaderTitle = () => {
    switch (role) {
      case 'DRIVER':
        return 'ResQDrive';
      case 'MECHANIC':
        return 'Workshop Dashboard';
      case 'ADMIN':
        return 'Admin Controls';
      default:
        return 'ResQDrive';
    }
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1e1e1e', elevation: 0, shadowOpacity: 0 },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
        cardStyle: { backgroundColor: '#121212' },
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={getHomeComponent()} 
        options={{ title: getHeaderTitle() }} 
      />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="Hospitals" component={HospitalsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function Navigation() {
  const { isAuthenticated, isLoading, user } = useSelector((state: RootState) => state.auth);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated && user ? <AppStack role={user.role} /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 24,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 12,
  },
  scrollList: {
    flex: 1,
    marginBottom: 20,
  },
  approvalCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  specializationBadge: {
    backgroundColor: '#3a2222',
    color: '#ff8a80',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
  cardInfo: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 4,
  },
  approveBtn: {
    backgroundColor: '#388e3c',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  approveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginVertical: 40,
  },
  emptyText: {
    color: '#888888',
    fontSize: 15,
    textAlign: 'center',
  },
  errorText: {
    color: '#ff8a80',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
  navBtn: {
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  navBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});